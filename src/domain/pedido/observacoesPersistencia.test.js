import { montarObservacoesPersistencia } from './observacoesPersistencia';

test('envia textos e indicadores da tela, incluindo observações desmarcadas', () => {
    expect(montarObservacoesPersistencia([
        { descricao: 'Entrega pela manhã', pedido: true, nota: false, registro: true, financeiro: false },
        { descricao: 'Contatar cliente', pedido: false, nota: true, registro: false, financeiro: true },
        { descricao: 'Sem marcação' }
    ])).toEqual([
        { numSeqObs: 1, txtObs: 'Entrega pela manhã', indPedido: 1, indNf: 0, indRegistro: 1, indCr: 0 },
        { numSeqObs: 2, txtObs: 'Contatar cliente', indPedido: 0, indNf: 1, indRegistro: 0, indCr: 1 },
        { numSeqObs: 3, txtObs: 'Sem marcação', indPedido: 0, indNf: 0, indRegistro: 0, indCr: 0 }
    ]);
});

test('mantém sequência contínua após exclusões e pula a sequência técnica 99', () => {
    const observacoes = Array.from({ length: 100 }, (_, i) => ({ num_seq: i + 5, descricao: `Obs ${i}` }));
    const resultado = montarObservacoesPersistencia(observacoes);
    expect(resultado[0].numSeqObs).toBe(1);
    expect(resultado.slice(97).map(obs => obs.numSeqObs)).toEqual([98, 100, 101]);
    expect(resultado.some(obs => obs.numSeqObs === 99)).toBe(false);
    expect(montarObservacoesPersistencia([])).toEqual([]);
});
