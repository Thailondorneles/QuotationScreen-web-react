import { calcularCobrancaFrete } from './cobrancaFrete';

const itens = [
    { seq: 1, unidade: 201, selecionado: true, quantidade: 2, valorFrete: 40 },
    { seq: 2, unidade: 201, selecionado: true, quantidade: 1, valorFrete: 30.48 },
    { seq: 3, unidade: 203, selecionado: true, quantidade: 1, valorFrete: 53.78 }
];
const fretes = { 201: { valor: 70.48 }, 203: { valor: 53.78 } };

test('valor fixo é cobrado integralmente em cada pedido e rateado apenas entre seus itens', () => {
    const resultado = calcularCobrancaFrete(itens, fretes, 'COBRAR_NF', { tipo: 'VALOR', valor: '50' });
    expect(resultado.porUnidade).toEqual({ 201: 50, 203: 50 });
    expect(resultado.total).toBe(100);
    expect(resultado.porItem[1] + resultado.porItem[2]).toBe(50);
    expect(resultado.porItem[3]).toBe(50);
});

test('cobra somente unidades com itens selecionados, inclusive sem cotação de frete', () => {
    const resultado = calcularCobrancaFrete(itens.map(item => ({ ...item, selecionado: item.unidade === 201 })), {}, 'COBRAR_NF', { tipo: 'VALOR', valor: '50' });
    expect(resultado.porUnidade).toEqual({ 201: 50 });
    expect(resultado.total).toBe(50);
});

test('percentual continua aplicado ao custo do frete e CIF não cobra do cliente', () => {
    const resultado = calcularCobrancaFrete(itens, fretes, 'COBRAR_NF', { tipo: 'PERCENTUAL', valor: '50' });
    expect(resultado.porUnidade).toEqual({ 201: 35.24, 203: 26.89 });
    expect(calcularCobrancaFrete(itens, fretes, 'CIF', { tipo: 'VALOR', valor: '50' }).total).toBe(0);
});
