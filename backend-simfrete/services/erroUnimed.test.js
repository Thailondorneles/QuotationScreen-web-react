const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mensagemErroUnimed } = require('./erroUnimed');

test('preserva a mensagem e o status retornados pelo handler', () => {
  assert.equal(mensagemErroUnimed({ response: { status: 409, data: { erro: 'Pedido integrado' } } }),
    'ORDS retornou HTTP 409: Pedido integrado');
});

test('não mostra página HTML e informa status do ORDS', () => {
  assert.equal(mensagemErroUnimed({ response: { status: 500, data: '<html>erro</html>' } }),
    'ORDS retornou HTTP 500. Verifique o handler no ORDS.');
});

test('distingue timeout de falha de conexão', () => {
  assert.match(mensagemErroUnimed({ code: 'ECONNABORTED' }), /Tempo limite/);
  assert.equal(mensagemErroUnimed({ code: 'ECONNREFUSED' }), 'Não foi possível conectar ao ORDS.');
});

test('remove marcação e CSS das mensagens estruturadas', () => {
  assert.equal(mensagemErroUnimed({ response: { status: 400, data: {
    message: '<style>body{color:red}</style><p>Parâmetro inválido</p>'
  } } }), 'ORDS retornou HTTP 400: Parâmetro inválido');
});
