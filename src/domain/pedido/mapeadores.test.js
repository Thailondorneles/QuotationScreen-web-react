import { criarMapeadoresPedido } from './mapeadores';
import { limparCamposVazios, valorDecimalErp } from './formatacao';

function montarFrete(opcaoFrete, tipo, valor, itens = []) {
    const mapeadores = criarMapeadoresPedido({
        opcaoFrete, cobrancaFrete: { tipo, valor }, observacoes: [],
        limparCamposVazios, valorDecimalErp, dataAtualErp: () => '07/10/2026',
        cobrancaCalculada: { porItem: {} }, CondPgto: { cod_cond_pgto: 1 },
        operacao: { cod_oper: 1 }, cliente: { cod_pessoa: 1 }, getUsuarioIntegracao: () => 'teste'
    });
    return mapeadores.montarPayloadPedidoErpPorUnidade(201, itens).pePedidos;
}

test('envia o custo médio unitário de cada item ao NL', () => {
    const pedido = montarFrete('CIF', 'VALOR', '0', [
        { cod_item: 7084, quantidade: 50, valorLista: 12, vlrMedio: 8.1615 },
        { cod_item: 7085, quantidade: 10, valorLista: 20, vlrMedio: 9.25 }
    ]);
    expect(pedido.peItens).toEqual([
        expect.objectContaining({ codItem: '7084', vlrMedioUnitario: '8,1615' }),
        expect.objectContaining({ codItem: '7085', vlrMedioUnitario: '9,2500' })
    ]);
});

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
