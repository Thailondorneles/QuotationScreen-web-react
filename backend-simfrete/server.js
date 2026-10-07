const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const https = require('https');
const { registrarIntegracaoLog } = require('./services/integracaoLog');

dotenv.config({ quiet: true });

process.on('unhandledRejection', (reason) => {

});

process.on('uncaughtException', (err) => {

  process.exit(1);
});

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';
const simFreteUrl = 'https://centralunimed.simfrete.com/CotacaoService/consultar';
const unimedApiBaseUrl = process.env.UNIMED_API_BASE_URL;
const erpPedidosUrl = process.env.ERP_PEDIDOS_URL;

if (!process.env.SIMFRETE_USER || !process.env.SIMFRETE_PASS) {
  throw new Error('SIMFRETE_USER e SIMFRETE_PASS devem estar configurados.');
}

if (!unimedApiBaseUrl) {
  throw new Error('UNIMED_API_BASE_URL deve estar configurada.');
}

if (!erpPedidosUrl || !process.env.ERP_NL_TOKEN || !process.env.ERP_NL_APLICACAO) {
  throw new Error('ERP_PEDIDOS_URL, ERP_NL_TOKEN e ERP_NL_APLICACAO devem estar configurados.');
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
  const salvarPedido = req.method === 'POST' && ['EsPePedidosIns', 'EsPeItensIns', 'EsPeObservacoes', 'EsPeEnderecos', 'EsPePedidos/integracao'].includes(targetPath);
  if (req.method !== 'GET' && !atualizarParametro && !salvarPedido) {
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
      : salvarPedido ? await unimedApi.post(targetPath, req.body)
      : await unimedApi.get(targetPath, { params: req.query });

    return res.status(response.status).json(response.data);
  } catch (err) {

    return res.status(err?.response?.status || 500).json({
      erro: 'Erro ao acessar servico unimed',
      origem: 'ORDS',
      recurso: targetPath,
      metodo: req.method
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

    res.status(500).json({
      erro: 'Erro ao cotar frete'
    });
  }
});

const integracoesEmAndamento = new Set();

app.post('/api/pedidos/enviar-erp', async (req, res) => {
  let etapa = 'inicio';
  let payloadErp;
  const numSeqPedido = Number(req.body.numSeqPedido);
  if (!Number.isSafeInteger(numSeqPedido) || numSeqPedido <= 0) {
    return res.status(400).json({ erro: 'Salve a cotacao e informe numSeqPedido antes de integrar.' });
  }
  const unidade = Number(req.body.pePedidos?.codUnidade);
  if (![201, 203].includes(unidade)) return res.status(400).json({ erro: 'Unidade invalida.' });
  const chaveIntegracao = `${numSeqPedido}:${unidade}`;
  if (integracoesEmAndamento.has(chaveIntegracao)) return res.status(409).json({ erro: 'Envio desta unidade em andamento.' });
  integracoesEmAndamento.add(chaveIntegracao);

  try {
    etapa = 'consultar_cotacao';
    const { data } = await unimedApi.get(`EsPePedidos/${encodeURIComponent(numSeqPedido)}`);
    if (!Array.isArray(data?.items) || data.hasMore) {
      throw new Error('Resposta invalida ao consultar a versao atual da cotacao.');
    }
    const registros = data.items.filter(pedido => String(pedido.num_seq_pedido) === String(numSeqPedido));
    if (!registros.length) return res.status(409).json({ erro: 'Cotacao ainda nao salva.' });
    if (registros.length !== 1 || !Number.isSafeInteger(Number(registros[0].cod_vers_cotacao)) || Number(registros[0].cod_vers_cotacao) < 1) {
      throw new Error('A API deve retornar somente a versao atual da cotacao.');
    }
    const atual = registros[0];
    if (!Object.hasOwn(atual, 'num_pedido_matriz') || !Object.hasOwn(atual, 'num_pedido_filial')) {
      throw new Error('A API nao retornou os numeros de pedido por unidade.');
    }
    const numeroExistente = unidade === 201 ? atual.num_pedido_matriz : atual.num_pedido_filial;
    if (numeroExistente != null) {
      if (!/^\d+\/\d+$/.test(String(numeroExistente))) {
        return res.status(409).json({ erro: 'A versao atual possui numero/complemento invalido. Confira o pedido no NL e corrija o registro da cotacao antes de reenviar.' });
      }
      return res.json({ sucesso: true, numSeq: numSeqPedido, jaIntegrado: true, numeroPedido: numeroExistente });
    }

    etapa = 'montar_payload_erp';
    payloadErp = {
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
            txtObs: String(numSeqPedido),
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
    delete payloadErp.numSeqPedido;

    etapa = 'post_erp';
    const response = await erpApi.post(erpPedidosUrl, payloadErp);
    const logRegistrado = await registrarIntegracaoLog(unimedApi, {
      numSeq: numSeqPedido, status: 'INTEGRADO', payload: payloadErp, respostaErp: response.data
    });
    res.json({ sucesso: true, numSeq: numSeqPedido, retornoErp: response.data, unidadesIntegradas: [unidade], logRegistrado });
  } catch (err) {
    const erro = err?.response?.data || err.message;
    const statusErro = err?.response?.status || 500;

    if (etapa === 'post_erp') {
      await registrarIntegracaoLog(unimedApi, {
        numSeq: numSeqPedido, status: 'ERRO', payload: payloadErp,
        respostaErp: err.response?.data ?? null, erro
      });
    }

    if (res.headersSent) {
      return;
    }

    return res.status(statusErro).json({
      sucesso: false,
      numSeq: numSeqPedido,
      erro: 'Erro ao integrar pedido com o ERP',
      etapa,
      detalhe: erro
    });
  } finally {
    integracoesEmAndamento.delete(chaveIntegracao);

  }
});

const server = app.listen(port, host, () => {

});

server.on('error', (err) => {

  process.exit(1);
});
