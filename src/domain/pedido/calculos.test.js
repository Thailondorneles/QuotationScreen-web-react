import { criarCalculosPedido } from './calculos';
import { numeroDecimalBR } from './formatacao';

const calculosST = criarCalculosPedido({
    numeroDecimalBR, cobrancaCalculada: { valorFixo: false, porItem: {} }
});
const itemST = {
    seq: 1, quantidade: 112, valorLista: 49.9, vlrMedio: 0,
    impostos: { indSubsMercadoria: 1, idxSubsTrib: 1.656, perSubstTrib: 17, perIcms: 17 }
};

test('deduz ICMS próprio da ST por índice e exclui somente a ST da sobra', () => {
    const valores = calculosST.calcularValoresItem(itemST);
    expect(valores.baseSubs).toBeCloseTo(9255.0528, 6);
    expect(valores.icms).toBeCloseTo(950.096, 6);
    expect(valores.st).toBeCloseTo(623.262976, 6);
    expect(valores.totalImpostos).toBeCloseTo(1573.358976, 6);
    expect(valores.impostosSobreSobra).toBeCloseTo(950.096, 6);
    expect(valores.sobraReal).toBeCloseTo(4638.704, 6);
    expect(calculosST.calcularPercentualMaximoSobra(itemST)).toBeCloseTo(83, 6);
    const preco = calculosST.calcularValorListaPorSobra(itemST, 25);
    // Com custo positivo, a formação de preço deve preservar a sobra desejada.
    const itemComCusto = { ...itemST, vlrMedio: 20 };
    const precoComCusto = calculosST.calcularValorListaPorSobra(itemComCusto, 25);
    expect(preco).toBe(0);
    expect(calculosST.calcularValoresItem({ ...itemComCusto, valorLista: precoComCusto }).sobraPercentual).toBeCloseTo(25, 6);
});

test('mantém a prioridade da base ST informada e deduz o ICMS próprio', () => {
    const valores = calculosST.calcularValoresItem({ ...itemST, baseST: 100 });
    expect(valores.baseSubs).toBe(11200);
    expect(valores.st).toBeCloseTo(953.904, 6);
    expect(valores.sobraReal).toBeCloseTo(4638.704, 6);
    const itemComCusto = { ...itemST, baseST: 100, vlrMedio: 20 };
    const preco = calculosST.calcularValorListaPorSobra(itemComCusto, 25);
    expect(preco).toBeCloseTo(20 / 0.58, 6);
    expect(calculosST.calcularValoresItem({ ...itemComCusto, valorLista: preco }).sobraPercentual).toBeCloseTo(25, 6);
});

test('deduz o ICMS próprio calculado com frete e IPI sem alterar a composição da base ST', () => {
    const calculos = criarCalculosPedido({
        numeroDecimalBR, cobrancaCalculada: { valorFixo: false, porItem: { 1: 10 } }
    });
    const valores = calculos.calcularValoresItem({
        seq: 1, quantidade: 1, valorLista: 100,
        impostos: {
            indSubsMercadoria: 1, idxSubsTrib: 1.5, perSubstTrib: 17, perIcms: 17, perIpi: 10,
            indIcmsFreteSoma: 1, indIcmsIpiSoma: 1, indSubsFreteSoma: 1, indSubsIpiSoma: 1
        }
    });
    expect(valores.baseSubs).toBe(170);
    expect(valores.icms).toBeCloseTo(20.4, 6);
    expect(valores.st).toBeCloseTo(8.5, 6);
});

test('preserva DIFAL e itens sem substituição tributária', () => {
    const valoresDifal = calculosST.calcularValoresItem({
        ...itemST, impostos: { ...itemST.impostos, difal: 'DIFAL', perDifal: 5 }
    });
    expect(valoresDifal.st).toBe(0);
    expect(valoresDifal.difal).toBeCloseTo(279.44, 6);
    expect(valoresDifal.sobraReal).toBeCloseTo(4359.264, 6);
    const valoresSemST = calculosST.calcularValoresItem({
        ...itemST, impostos: { ...itemST.impostos, indSubsMercadoria: 0 }
    });
    expect(valoresSemST.st).toBe(0);
    expect(valoresSemST.icms).toBeCloseTo(950.096, 6);
});

test('mantém os demais impostos e o frete na sobra de item com ST', () => {
    const calculos = criarCalculosPedido({
        numeroDecimalBR, cobrancaCalculada: { valorFixo: true, porItem: { 1: 10 } }
    });
    const item = {
        seq: 1, quantidade: 1, valorLista: 200, vlrMedio: 50,
        impostos: {
            indSubsMercadoria: 1, idxSubsTrib: 2, perSubstTrib: 17,
            perIcms: 17, perPis: 1, perCofins: 3, perIpi: 5, perFcp: 2
        }
    };
    const valores = calculos.calcularValoresItem(item);
    expect(valores.st).toBe(34);
    expect(valores.totalImpostos).toBe(90);
    expect(valores.impostosSobreSobra).toBe(56);
    expect(valores.sobraReal).toBe(84);
    const preco = calculos.calcularValorListaPorSobra(item, 25);
    expect(calculos.calcularValoresItem({ ...item, valorLista: preco }).sobraPercentual).toBeCloseTo(25, 6);
});

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
