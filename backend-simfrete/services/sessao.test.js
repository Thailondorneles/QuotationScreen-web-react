const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const { criarSessao } = require('./sessao');

async function servir(app, contexto) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  contexto.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('login, verificacao em outra aba, operacao protegida e revogacao com ORDS HTTP 200', async contexto => {
  const ords = express();
  let sessaoAtiva;
  const atividades = [];
  ords.use(express.json());
  ords.post('/auth/login', (req, res) => {
    assert.equal(req.body.inatividade_minutos, 30);
    assert.equal(req.body.limite_absoluto_minutos, 480);
    assert.equal(req.body.username, 'teste');
    if (req.body.password !== 'senha-ficticia') {
      return res.json({ success: false, status: 401, message: 'Usuario ou senha invalidos' });
    }
    assert.match(req.body.token_hash, /^[a-f0-9]{64}$/);
    sessaoAtiva = req.body.token_hash;
    res.json({ success: true, cod_pessoa: 123, cod_perfil: 9000 });
  });
  ords.post('/auth/sessao/validar', (req, res) => {
    if (req.body.token_hash !== sessaoAtiva) {
      return res.json({ codigo: 'SESSAO_INVALIDA' });
    }
    atividades.push(req.body.registrar_atividade);
    res.json({ cod_pessoa: 123, validade_ms: 1800000 });
  });
  ords.post('/auth/sessao/revogar', (req, res) => {
    assert.equal(req.body.token_hash, sessaoAtiva);
    sessaoAtiva = undefined;
    res.json({ codigo: 'SESSAO_REVOGADA' });
  });

  const appOrigin = 'http://localhost:3000';
  const sessao = criarSessao({
    baseURL: await servir(ords, contexto), appOrigin, allowHttp: true, inatividade: 30, limite: 480,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/auth', sessao.router);
  app.use('/api', sessao.exigirSessao);
  app.get('/api/unimed/demandaContratos', (_req, res) => res.json(res.locals.usuario));
  const origemApi = await servir(app, contexto);
  const login = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: appOrigin },
    body: JSON.stringify({ usuario: 'teste', senha: 'senha-ficticia' }),
  };

  assert.equal((await fetch(origemApi + '/api/unimed/demandaContratos')).status, 401);
  assert.equal((await fetch(origemApi + '/api/auth/login', {
    ...login, headers: { ...login.headers, Origin: 'https://outro.example' },
  })).status, 403);
  const negado = await fetch(origemApi + '/api/auth/login', {
    ...login, body: JSON.stringify({ usuario: 'teste', senha: 'incorreta' }),
  });
  assert.equal(negado.status, 401);
  assert.equal(negado.headers.get('set-cookie'), null);

  const resposta = await fetch(origemApi + '/api/auth/login', {
    ...login,
    headers: { ...login.headers, Origin: 'http://localhost:3001', 'Sec-Fetch-Site': 'same-origin' },
  });
  assert.equal(resposta.status, 204);
  const setCookie = resposta.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly; SameSite=Lax/);
  const cookie = setCookie.split(';')[0];
  const token = cookie.split('=')[1];
  assert.equal(createHash('sha256').update(token).digest('hex'), sessaoAtiva);
  assert.notEqual(token, sessaoAtiva);
  const headers = { Cookie: cookie };

  const novaAba = await fetch(origemApi + '/api/auth/sessao', { headers });
  assert.deepEqual(await novaAba.json(), { usuario: { codigoPessoa: 123 }, validadeMs: 1800000 });
  const demanda = await fetch(origemApi + '/api/unimed/demandaContratos', { headers });
  assert.deepEqual(await demanda.json(), { codigoPessoa: 123 });
  assert.deepEqual(atividades, [0, 1]);

  const logout = await fetch(origemApi + '/api/auth/logout', {
    method: 'POST', headers: { ...headers, Origin: appOrigin },
  });
  assert.equal(logout.status, 204);
  assert.equal((await fetch(origemApi + '/api/auth/sessao', { headers })).status, 401);
});
