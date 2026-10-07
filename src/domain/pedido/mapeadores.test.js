import { criarMapeadoresPedido } from './mapeadores';
import { limparCamposVazios, valorDecimalErp } from './formatacao';

function montarFrete(opcaoFrete, tipo, valor) {
    const mapeadores = criarMapeadoresPedido({
        opcaoFrete, cobrancaFrete: { tipo, valor }, observacoes: [],
        limparCamposVazios, valorDecimalErp, dataAtualErp: () => '07/10/2026',
        cobrancaCalculada: { porItem: {} }, CondPgto: { cod_cond_pgto: 1 },
        operacao: { cod_oper: 1 }, cliente: { cod_pessoa: 1 }, getUsuarioIntegracao: () => 'teste'
    });
    return mapeadores.montarPayloadPedidoErpPorUnidade(201, []).pePedidos;
}

test.each(['PERCENTUAL', 'VALOR'])('CIF envia tipo 1 e destaque 1 com cobrança %s', tipo => {
    const pedido = montarFrete('CIF', tipo, '100');
    expect(pedido.tipFrete).toBe(1);
    expect(pedido.indDestaqueFrete).toBe(1);
    expect(pedido).not.toHaveProperty('perFretePago');
    expect(pedido).not.toHaveProperty('vlrFretePago');
});

test('cobrar na NF em percentual envia perFretePago', () => {
    const pedido = montarFrete('COBRAR_NF', 'PERCENTUAL', '75,5');
    expect(pedido).toEqual(expect.objectContaining({ tipFrete: 3, indDestaqueFrete: 1, perFretePago: '75,5000' }));
    expect(pedido).not.toHaveProperty('vlrFretePago');
});

test('cobrar na NF em reais envia vlrFretePago', () => {
    const pedido = montarFrete('COBRAR_NF', 'VALOR', '1.250,50');
    expect(pedido).toEqual(expect.objectContaining({ tipFrete: 3, indDestaqueFrete: 1, vlrFretePago: '1250,5000' }));
    expect(pedido).not.toHaveProperty('perFretePago');
});
