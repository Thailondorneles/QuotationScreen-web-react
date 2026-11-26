const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const { criarSessao } = require('./sessao');
const carregarPrazos = async () => ({ inatividade_minutos: 30, limite_absoluto_minutos: 480 });

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
  let consultasPerfil = 0;
  const sessao = criarSessao({
    baseURL: await servir(ords, contexto), appOrigin, carregarPrazos,
    consultarPerfil: async codigo => {
      consultasPerfil += 1;
      assert.equal(codigo, 123);
      return { cod_pessoa: 123, des_pessoa: 'Usuário de teste', cod_perfil: 9000, des_perfil: 'Administrador' };
    },
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
  const usuario = { codigoPessoa: 123, nome: 'teste', codigoPerfil: 9000 };
  const perfil = { ...usuario, nome: 'Usuário de teste', descricaoPerfil: 'Administrador' };
  assert.deepEqual(await novaAba.json(), { usuario: perfil, validadeMs: 1800000 });
  const segundaAba = await fetch(origemApi + '/api/auth/sessao', { headers });
  assert.deepEqual(await segundaAba.json(), { usuario: perfil, validadeMs: 1800000 });
  assert.equal(consultasPerfil, 1);
  const demanda = await fetch(origemApi + '/api/unimed/demandaContratos', { headers });
  assert.deepEqual(await demanda.json(), usuario);
  assert.ok(Number(demanda.headers.get('x-sessao-expira-em')) > Date.now());
  assert.deepEqual(atividades, [0, 0, 1]);

  const logout = await fetch(origemApi + '/api/auth/logout', {
    method: 'POST', headers: { ...headers, Origin: appOrigin },
  });
  assert.equal(logout.status, 204);
  assert.equal((await fetch(origemApi + '/api/auth/sessao', { headers })).status, 401);
});

test('agrupa somente leituras simultâneas da mesma sessão e verifica gravações individualmente', async contexto => {
  const ords = express();
  const contas = Array.from({ length: 16 }, (_, i) => ({
    token: randomBytes(32).toString('hex'),
    codigoPessoa: i + 1,
  }));
  const sessoes = new Map(contas.map(({ token, codigoPessoa }) => [
    createHash('sha256').update(token).digest('hex'), codigoPessoa,
  ]));
  let validacoes = 0;
  let liberar;
  let avisarInicio;
  let chamadasExpress = 0;
  ords.use(express.json());
  ords.post('/auth/sessao/validar', async (req, res) => {
    validacoes += 1;
    const codigoPessoa = sessoes.get(req.body.token_hash);
    avisarInicio?.();
    if (liberar) await liberar;
    res.json(codigoPessoa
      ? { cod_pessoa: codigoPessoa, validade_ms: 1800000 }
      : { codigo: 'SESSAO_INVALIDA' });
  });
  ords.post('/auth/sessao/revogar', (req, res) => {
    sessoes.delete(req.body.token_hash);
    res.json({ codigo: 'SESSAO_REVOGADA' });
  });

  const appOrigin = 'http://localhost:3000';
  const sessao = criarSessao({
    baseURL: await servir(ords, contexto), appOrigin, carregarPrazos,
  });
  const app = express();
  app.use('/api/auth', sessao.router);
  app.use('/api', (req, res, next) => {
    chamadasExpress += 1;
    return sessao.exigirSessao(req, res, next);
  });
  app.all('/api/unimed/:recurso', (_req, res) => res.json(res.locals.usuario));
  const origemApi = await servir(app, contexto);
  const chamar = (conta, metodo = 'GET', recurso = 'clientes') => fetch(
    origemApi + '/api/unimed/' + recurso,
    { method: metodo, headers: { Cookie: 'quotation-session-local=' + conta.token, Origin: appOrigin } },
  );

  const antes = performance.now();
  let abrirValidacoes;
  liberar = new Promise(resolve => { abrirValidacoes = resolve; });
  const leituras = contas.flatMap(conta => Array.from({ length: 8 }, async () => {
    const resposta = await chamar(conta);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { codigoPessoa: conta.codigoPessoa });
  }));
  // Aguarda a entrada das 128 requisições antes de liberar as respostas do ORDS simulado.
  try {
    for (let i = 0; chamadasExpress < leituras.length && i < 200; i++) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    assert.equal(chamadasExpress, leituras.length);
  } finally {
    abrirValidacoes();
  }
  await Promise.all(leituras);
  assert.equal(validacoes, contas.length);
  contexto.diagnostic(`${leituras.length} leituras, ${validacoes} validações, ${Math.round(performance.now() - antes)} ms com ORDS simulado`);

  await Promise.all([
    chamar(contas[0], 'POST'),
    chamar(contas[0], 'POST'),
    chamar(contas[0], 'GET', 'EsPeSequencia'),
    chamar(contas[0], 'GET', 'EsPeSequencia'),
  ]).then(respostas => respostas.forEach(resposta => assert.equal(resposta.status, 200)));
  assert.equal(validacoes, contas.length + 4);

  liberar = new Promise(resolve => { abrirValidacoes = resolve; });
  const iniciou = new Promise(resolve => { avisarInicio = resolve; });
  const consultaEmAndamento = chamar(contas[0]);
  try {
    await iniciou;
    const logout = await fetch(origemApi + '/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: 'quotation-session-local=' + contas[0].token, Origin: appOrigin },
    });
    assert.equal(logout.status, 204);
  } finally {
    abrirValidacoes();
  }
  assert.equal((await consultaEmAndamento).status, 401);
  assert.equal((await chamar(contas[0])).status, 401);
  assert.equal(validacoes, contas.length + 6);
  assert.equal((await chamar(contas[1])).status, 200);
});
