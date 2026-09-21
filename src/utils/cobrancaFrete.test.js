import { calcularCobrancaFrete, calcularSobraComFrete, ratearValor } from './cobrancaFrete';

const itens = [{ seq: 1, unidade: 201, selecionado: true, quantidade: 1, valorFrete: 100 }];
const fretes = { 201: { valor: 100 } };

test.each([
    ['PERCENTUAL', '100', 100, 110, 11],
    ['PERCENTUAL', '50', 50, 60, 6],
    ['VALOR', '50', 50, 60, 6],
    ['VALOR', '0', 0, 10, 1]
])('cobrança %s %s recupera o custo na sobra', (tipo, valor, cobrado, sobra, percentual) => {
    const resultado = calcularCobrancaFrete(itens, fretes, 'COBRAR_NF', { tipo, valor });
    expect(resultado.porItem[1]).toBe(cobrado);
    const margem = calcularSobraComFrete(1000, 890, 0, 100, resultado.porItem[1]);
    expect(margem.sobraReal).toBe(sobra);
    expect(margem.sobraPercentual).toBe(percentual);
});

test('CIF não cobra frete', () => {
    expect(calcularCobrancaFrete(itens, fretes, 'CIF', { tipo: 'VALOR', valor: '50' }).total).toBe(0);
});

test('valor fixo é dividido entre unidades e não duplicado', () => {
    const resultado = calcularCobrancaFrete([...itens,
        { seq: 2, unidade: 203, selecionado: true, quantidade: 2, valorFrete: 300 },
        { seq: 3, unidade: 203, selecionado: false, quantidade: 2, valorFrete: 100 }
    ], { ...fretes, 203: { valor: 300, manual: true } }, 'COBRAR_NF', { tipo: 'VALOR', valor: '50,00' });
    expect(resultado.porUnidade).toEqual({ 201: 12.5, 203: 37.5 });
    expect(resultado.porItem).toEqual({ 1: 12.5, 2: 37.5 });
    expect(resultado.total).toBe(50);
});

test('rateio conserva centavos e permite cobrança fixa sem cotação', () => {
    expect(ratearValor(100, [1, 1, 1])).toEqual([33.33, 33.34, 33.33]);
    const resultado = calcularCobrancaFrete(itens, {}, 'COBRAR_NF', { tipo: 'VALOR', valor: '25,50' });
    expect(resultado.porItem[1]).toBe(25.5);
});
