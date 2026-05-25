const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const oracledb = require('oracledb');
const http = require('http');
const https = require('https');

dotenv.config();

function iniciarOracleClient() {
  const libDir = process.env.ORACLE_CLIENT_LIB_DIR;

  if (!libDir) {
    return;
  }

  oracledb.initOracleClient({ libDir });
}

iniciarOracleClient();

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';
const simFreteUrl = 'https://centralunimed.simfrete.com/CotacaoService/consultar';
const unimedApiBaseUrl = process.env.UNIMED_API_BASE_URL;
const erpPedidosUrl = process.env.ERP_PEDIDOS_URL;
let oraclePool;

if (!process.env.SIMFRETE_USER || !process.env.SIMFRETE_PASS) {
  throw new Error('SIMFRETE_USER e SIMFRETE_PASS devem estar configurados.');
}

if (!unimedApiBaseUrl) {
  throw new Error('UNIMED_API_BASE_URL deve estar configurada.');
}

if (!erpPedidosUrl || !process.env.ERP_NL_TOKEN || !process.env.ERP_NL_APLICACAO) {
  throw new Error('ERP_PEDIDOS_URL, ERP_NL_TOKEN e ERP_NL_APLICACAO devem estar configurados.');
}

if (!process.env.ORACLE_USER || !process.env.ORACLE_PASSWORD || !process.env.ORACLE_CONNECT_STRING) {
  throw new Error('ORACLE_USER, ORACLE_PASSWORD e ORACLE_CONNECT_STRING devem estar configurados.');
}

const unimedApi = axios.create({
  baseURL: unimedApiBaseUrl,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const erpHttpAgent = new http.Agent({ keepAlive: true });
const erpHttpsAgent = new https.Agent({ keepAlive: true });

const erpApi = axios.create({
  timeout: 30000,
  httpAgent: erpHttpAgent,
  httpsAgent: erpHttpsAgent,
  headers: {
    'Content-Type': 'application/json',
    'x-nl-token': process.env.ERP_NL_TOKEN,
    'x-nl-aplicacao': process.env.ERP_NL_APLICACAO
  }
});

async function getOracleConnection() {
  if (oraclePool) {
    return oraclePool.getConnection();
  }

  return oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING
  });
}

async function iniciarOraclePool() {
  oraclePool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
    poolMax: Number(process.env.ORACLE_POOL_MAX || 4),
    poolIncrement: 1
  });
}

async function gerarNumeroPedido(connection) {
  const result = await connection.execute(
    'SELECT SEQ_PEDIDO_ERP_INTEGRACAO.NEXTVAL AS NUM_PEDIDO FROM DUAL',
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0].NUM_PEDIDO;
}

function toClobValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
}

function clobBind(value) {
  return {
    val: toClobValue(value),
    type: oracledb.CLOB
  };
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/unimed', async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Metodo nao permitido' });
  }

  const targetPath = req.path.replace(/^\/+/, '');

  if (!targetPath) {
    return res.status(400).json({ erro: 'Recurso nao informado' });
  }

  try {
    const response = await unimedApi.get(targetPath, {
      params: req.query
    });

    return res.status(response.status).json(response.data);
  } catch (err) {
    return res.status(err?.response?.status || 500).json({
      erro: 'Erro ao consultar servico unimed'
    });
  }
});

app.post('/api/cotacao', async (req, res) => {
  try {
    const payload = {
      ...req.body,
      wsEmp: 'central unimed',
      wsUsr: process.env.SIMFRETE_USER,
      wsPwd: process.env.SIMFRETE_PASS
    };

    const response = await axios.post(
      simFreteUrl,
      payload,
      { timeout: 20000 }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      erro: 'Erro ao cotar frete'
    });
  }
});

app.post('/api/pedidos/enviar-erp', async (req, res) => {
  let connection;
  let numPedido;
  let etapa = 'inicio';

  try {
    etapa = 'conectar_oracle';
    connection = await getOracleConnection();

    etapa = 'gerar_numero_pedido';
    numPedido = await gerarNumeroPedido(connection);

    etapa = 'montar_payload_erp';
    const payloadErp = {
      ...req.body,
      pePedidos: {
        ...req.body.pePedidos,
        numPedido: String(numPedido)
      }
    };

    etapa = 'inserir_controle_integracao';
    const insertPromise = connection.execute(
      `INSERT INTO PEDIDO_ERP_INTEGRACAO
        (NUM_PEDIDO, STATUS, PAYLOAD, USUARIO)
       VALUES
        (:numPedido, :status, :payload, :usuario)`,
      {
        numPedido,
        status: 'ENVIANDO',
        payload: clobBind(payloadErp),
        usuario: req.body.usuario || null
      },
      { autoCommit: true }
    );

    etapa = 'post_erp';
    const [response] = await Promise.all([
      erpApi.post(erpPedidosUrl, payloadErp),
      insertPromise
    ]);

    res.json({
      sucesso: true,
      numPedido,
      retornoErp: response.data
    });

    etapa = 'atualizar_integracao_sucesso';
    await connection.execute(
      `UPDATE PEDIDO_ERP_INTEGRACAO
          SET STATUS = :status,
              RESPOSTA_ERP = :resposta,
              DATA_ENVIO = SYSDATE
        WHERE NUM_PEDIDO = :numPedido`,
      {
        status: 'INTEGRADO',
        resposta: clobBind(response.data),
        numPedido
      },
      { autoCommit: true }
    );
  } catch (err) {
    const erro = err?.response?.data || err.message;
    const statusErro = err?.response?.status || 500;

    if (connection && numPedido) {
      try {
        etapa = 'atualizar_integracao_erro';
        await connection.execute(
          `UPDATE PEDIDO_ERP_INTEGRACAO
              SET STATUS = :status,
                  ERRO = :erro,
                  DATA_ENVIO = SYSDATE
            WHERE NUM_PEDIDO = :numPedido`,
          {
            status: 'ERRO',
            erro: clobBind(erro),
            numPedido
          },
          { autoCommit: true }
        );
      } catch (updateErr) {
      }
    }

    if (res.headersSent) {
      return;
    }

    return res.status(statusErro).json({
      sucesso: false,
      numPedido,
      erro: 'Erro ao integrar pedido com o ERP',
      etapa,
      detalhe: erro
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
      }
    }
  }
});

async function iniciarServidor() {
  await iniciarOraclePool();

  app.listen(port, host);
}

iniciarServidor().catch((err) => {
  process.exit(1);
});
