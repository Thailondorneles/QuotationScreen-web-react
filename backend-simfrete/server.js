const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const oracledb = require('oracledb');
const http = require('http');
const https = require('https');

dotenv.config({ quiet: true });

process.on('unhandledRejection', (reason) => {
  console.error('Erro assincrono nao tratado:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Excecao nao tratada:', err);
  process.exit(1);
});

let oracleClientIniciado = false;

function iniciarOracleClient() {
  if (oracleClientIniciado) {
    return;
  }

  const libDir = process.env.ORACLE_CLIENT_LIB_DIR;

  if (!libDir) {
    oracleClientIniciado = true;
    return;
  }

  oracledb.initOracleClient({ libDir });
  oracleClientIniciado = true;
  console.log(`Oracle Client inicializado em: ${libDir}`);
}

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';
const simFreteUrl = 'https://centralunimed.simfrete.com/CotacaoService/consultar';
const unimedApiBaseUrl = process.env.UNIMED_API_BASE_URL;
const erpPedidosUrl = process.env.ERP_PEDIDOS_URL;
let oraclePool;

console.log('Iniciando backend-simfrete...');
console.log('Configuracao carregada:', {
  port,
  host,
  unimedApiBaseUrl: Boolean(unimedApiBaseUrl),
  erpPedidosUrl: Boolean(erpPedidosUrl),
  oracleConnectString: Boolean(process.env.ORACLE_CONNECT_STRING),
  oracleClientLibDir: process.env.ORACLE_CLIENT_LIB_DIR || null
});

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
  iniciarOracleClient();

  if (oraclePool) {
    return oraclePool.getConnection();
  }

  oraclePool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
    poolMax: Number(process.env.ORACLE_POOL_MAX || 4),
    poolIncrement: 1
  });
  console.log('Pool Oracle iniciado.');

  return oraclePool.getConnection();
}

async function gerarNumeroSequencia(connection) {
  const result = await connection.execute(
    'SELECT SEQ_PEDIDO_ERP_INTEGRACAO.NEXTVAL AS NUM_SEQ FROM DUAL',
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0].NUM_SEQ;
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
  const encodedPath = req.originalUrl
    .slice(req.baseUrl.length)
    .split('?')[0];
  const targetPath = encodedPath.replace(/^\/+/, '');
  const atualizarParametro = req.method === 'PUT' && /^parsConf\/\d+$/.test(targetPath);
  if (req.method !== 'GET' && !atualizarParametro) {
    return res.status(405).json({ erro: 'Metodo nao permitido' });
  }
  if (atualizarParametro && typeof req.body?.parametro !== 'string') {
    return res.status(400).json({ erro: 'Informe o valor do parametro como texto.' });
  }

  if (!targetPath) {
    return res.status(400).json({ erro: 'Recurso nao informado' });
  }

  try {
    const response = atualizarParametro
      ? await unimedApi.put(targetPath, { parametro: req.body.parametro })
      : await unimedApi.get(targetPath, { params: req.query });

    return res.status(response.status).json(response.data);
  } catch (err) {
    console.error('Erro ao consultar servico unimed:', err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      erro: 'Erro ao consultar servico unimed'
    });
  }
});

app.post('/api/cotacao', async (req, res) => {
  try {
    const payload = {
      ...req.body,
      tipoOperacao: 0,
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
    console.error('Erro ao cotar frete:', err?.response?.data || err.message);
    res.status(500).json({
      erro: 'Erro ao cotar frete'
    });
  }
});

app.post('/api/pedidos/enviar-erp', async (req, res) => {
  let connection;
  let numSeq;
  let etapa = 'inicio';

  try {
    etapa = 'conectar_oracle';
    connection = await getOracleConnection();

    etapa = 'gerar_numero_sequencia';
    numSeq = await gerarNumeroSequencia(connection);

    etapa = 'montar_payload_erp';
    const payloadErp = {
      ...req.body,
      pePedidos: {
        ...req.body.pePedidos,
        numPedido: '-1',
        codCompl: 0,
        ...(req.body.pePedidos?.peEndEntrega && {
          peEndEntrega: { ...req.body.pePedidos.peEndEntrega, codCompl: 0 }
        }),
        peObservacoes: [
          ...(req.body.pePedidos?.peObservacoes || [])
            .filter(obs => Number(obs.numSeq) !== 99),
          {
            txtObs: String(numSeq),
            indPedido: 0,
            indNf: 0,
            indRegistro: 0,
            indCr: 0,
            numSeq: 99,
            tipTransacao: 1
          }
        ]
      }
    };

    etapa = 'inserir_controle_integracao';
    const insertPromise = connection.execute(
      `INSERT INTO ES_PEDIDO_ERP_INTEGRACAO
        (NUM_SEQ, STATUS, PAYLOAD, USUARIO)
       VALUES
        (:numSeq, :status, :payload, :usuario)`,
      {
        numSeq,
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
      numSeq,
      retornoErp: response.data
    });

    etapa = 'atualizar_integracao_sucesso';
    await connection.execute(
      `UPDATE ES_PEDIDO_ERP_INTEGRACAO
          SET STATUS = :status,
              RESPOSTA_ERP = :resposta,
              DATA_ENVIO = SYSDATE
        WHERE NUM_SEQ = :numSeq`,
      {
        status: 'INTEGRADO',
        resposta: clobBind(response.data),
        numSeq
      },
      { autoCommit: true }
    );
  } catch (err) {
    const erro = err?.response?.data || err.message;
    const statusErro = err?.response?.status || 500;
    console.error('Erro ao integrar pedido com o ERP:', {
      etapa,
      numSeq,
      statusErro,
      erro
    });
    console.error(err.stack);

    if (connection && numSeq) {
      try {
        etapa = 'atualizar_integracao_erro';
        await connection.execute(
          `UPDATE ES_PEDIDO_ERP_INTEGRACAO
              SET STATUS = :status,
                  ERRO = :erro,
                  DATA_ENVIO = SYSDATE
            WHERE NUM_SEQ = :numSeq`,
          {
            status: 'ERRO',
            erro: clobBind(erro),
            numSeq
          },
          { autoCommit: true }
        );
      } catch (updateErr) {
        console.error('Erro ao registrar falha de integracao:', updateErr.message);
      }
    }

    if (res.headersSent) {
      return;
    }

    return res.status(statusErro).json({
      sucesso: false,
      numSeq,
      erro: 'Erro ao integrar pedido com o ERP',
      etapa,
      detalhe: erro
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Erro ao fechar conexao Oracle:', closeErr.message);
      }
    }
  }
});

const server = app.listen(port, host, () => {
  console.log(`Backend rodando em http://${host}:${port}`);
});

server.on('error', (err) => {
  console.error('Erro ao iniciar servidor HTTP:', err);
  process.exit(1);
});
