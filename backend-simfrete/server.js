const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';
const simFreteUrl = 'https://centralunimed.simfrete.com/CotacaoService/consultar';
const unimedApiBaseUrl = process.env.UNIMED_API_BASE_URL;

if (!process.env.SIMFRETE_USER || !process.env.SIMFRETE_PASS) {
  throw new Error('SIMFRETE_USER e SIMFRETE_PASS devem estar configurados.');
}

if (!unimedApiBaseUrl) {
  throw new Error('UNIMED_API_BASE_URL deve estar configurada.');
}

const unimedApi = axios.create({
  baseURL: unimedApiBaseUrl,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

app.use(cors());
app.use(express.json({ limit: '100kb' }));

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
    console.error(err?.response?.data || err.message);

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
    console.error(err?.response?.data || err.message);

    res.status(500).json({
      erro: 'Erro ao cotar frete'
    });
  }
});

app.listen(port, host, () => {
  console.log(`Backend rodando em http://${host}:${port}`);
});
