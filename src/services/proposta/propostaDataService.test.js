import { criarPropostasPorUnidade } from './propostaDataService';

const dados = {
    itensPedido: [
        { seq: 1, unidade: 201, selecionado: true, quantidade: 1, valorLista: 1000, valorFrete: 100 },
        { seq: 2, unidade: 203, selecionado: true, quantidade: 1, valorLista: 1000, valorFrete: 100 }
    ],
    freteSelecionado: { 201: { valor: 100, nome: 'Frete manual', manual: true }, 203: { valor: 100, nome: 'Transportadora' } },
    opcaoFrete: 'COBRAR_NF'
};

test('PDF e Excel recebem somente a cobrança parcial, rateada por unidade', () => {
    const propostas = criarPropostasPorUnidade({ ...dados, cobrancaFrete: { tipo: 'VALOR', valor: '50' } });
    expect(propostas.map(p => p.frete.valor)).toEqual([25, 25]);
    expect(propostas.map(p => p.totalProposta)).toEqual([1025, 1025]);
});

test('CIF oculta cobrança e não aumenta o total', () => {
    const propostas = criarPropostasPorUnidade({ ...dados, opcaoFrete: 'CIF', cobrancaFrete: { tipo: 'VALOR', valor: '50' } });
    expect(propostas.every(p => p.frete.valor === null && !p.frete.valorVisivel && p.totalProposta === 1000)).toBe(true);
});

test('cobrança em reais sem cotação também é exportada', () => {
    const propostas = criarPropostasPorUnidade({ ...dados, freteSelecionado: {}, cobrancaFrete: { tipo: 'VALOR', valor: '50' } });
    expect(propostas.every(p => p.frete.valorVisivel && p.frete.valor === 25 && p.totalProposta === 1025)).toBe(true);
});
