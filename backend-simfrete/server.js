const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/cotacao', async (req, res) => {
  try {
    const payload = {
      ...req.body,
      wsEmp: 'central unimed',
      wsUsr: process.env.SIMFRETE_USER,
      wsPwd: process.env.SIMFRETE_PASS
    };

    const response = await axios.post(
      'https://centralunimed.simfrete.com/CotacaoService/consultar',
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

app.listen(3001, () => {
  console.log('Backend rodando em http://localhost:3001');
});