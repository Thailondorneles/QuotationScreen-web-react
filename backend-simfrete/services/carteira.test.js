const assert = require('node:assert/strict');
const { test } = require('node:test');
const { criarConsultaCarteira } = require('./carteira');

test('usa somente o representante da sessão e rejeita linhas fora da carteira', async () => {
  const consultar = criarConsultaCarteira({ get: async (_rota, { params }) => {
    assert.deepEqual(params, { offset: '0', limit: undefined, situacao: '37', cod_cliente: undefined, cod_rep_externo: 12 });
    return { data: { items: [{ cod_rep_externo: '99' }] } };
  } });

  await assert.rejects(consultar('demandaContratos', {
    cod_rep_externo: '99', COD_REP_EXTERNO: '99', situacao: '37', offset: '0',
  }, 12), /fora do escopo/);
});

test('autoriza detalhes após localizar o cliente na carteira paginada e evita consultar cliente de fora', async () => {
  const chamadas = [];
  const consultar = criarConsultaCarteira({ get: async (rota, { params }) => {
    chamadas.push(rota);
    if (rota !== 'clientes') return { data: { items: [] } };
    assert.equal(params.cod_rep_externo, 12);
    const primeira = params.offset === 0;
    return { data: { items: [{ cod_pessoa: primeira ? 56 : 78, cod_rep_externo: '12' }], hasMore: primeira } };
  } });

  assert.equal(await consultar('clientes/90', {}, 12), null);
  assert.deepEqual(chamadas, ['clientes', 'clientes']);
  await Promise.all([
    consultar('ClienteDetalhado/78', {}, 12),
    consultar('representantesCliente/78', {}, 12),
  ]);
  assert.deepEqual(chamadas.slice(2), ['clientes', 'clientes', 'ClienteDetalhado/78', 'representantesCliente/78']);
});
