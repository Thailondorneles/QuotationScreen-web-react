const assert = require('node:assert/strict');
const { test } = require('node:test');
const { criarPrazosSessao } = require('./prazosSessao');

test('reutiliza a leitura do ORDS e aplica novas durações ao salvar', async () => {
  const items = [
    { des_conf: 'SESSAO_INATIVIDADE_MINUTOS', parametro: '15' },
    { des_conf: 'SESSAO_LIMITE_ABSOLUTO_MINUTOS', parametro: '90' },
  ];
  let leituras = 0;
  const api = {
    get: async () => { leituras += 1; return { data: { items } }; },
    put: async (rota, body) => {
      items[rota.endsWith('/50') ? 0 : 1].parametro = body.parametro;
      return { status: 200 };
    },
  };
  const { carregar, atualizar } = criarPrazosSessao(api);
  const esperados = { inatividade_minutos: 15, limite_absoluto_minutos: 90 };
  assert.deepEqual(await Promise.all([carregar(), carregar()]), [esperados, esperados]);
  assert.equal(leituras, 1);
  assert.equal(await atualizar(51, '10'), null);
  assert.equal(await atualizar(50, '15.5'), null);
  assert.equal((await atualizar(50, '45')).status, 200);
  assert.deepEqual(await carregar(), { inatividade_minutos: 45, limite_absoluto_minutos: 90 });
  assert.equal(leituras, 2);
});
