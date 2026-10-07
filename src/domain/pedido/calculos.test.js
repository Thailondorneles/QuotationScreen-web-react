import { criarCalculosPedido } from './calculos';
import { numeroDecimalBR } from './formatacao';

test('valor fixo deduz somente o valor informado da sobra e independe da cotação', () => {
    const calculos = criarCalculosPedido({
        numeroDecimalBR, cobrancaCalculada: { valorFixo: true, porItem: { 1: 50 } }
    });
    const item = { seq: 1, quantidade: 1, valorLista: 200, vlrMedio: 100, valorFrete: 70.48 };
    expect(calculos.calcularValoresItem(item).sobraReal).toBe(50);
    expect(calculos.calcularValoresItem({ ...item, valorFrete: 150 }).sobraReal).toBe(50);
    const preco = calculos.calcularValorListaPorSobra(item, 25);
    expect(preco).toBe(200);
    expect(calculos.calcularValoresItem({ ...item, valorLista: preco }).sobraPercentual).toBe(25);
});

test('percentual mantém o custo cotado e o abatimento da cobrança', () => {
    const calculos = criarCalculosPedido({
        numeroDecimalBR, cobrancaCalculada: { valorFixo: false, porItem: { 1: 35 } }
    });
    expect(calculos.calcularValoresItem({ seq: 1, quantidade: 1, valorLista: 200, vlrMedio: 100, valorFrete: 70 }).sobraReal).toBe(65);
});
