export function montarObservacoesPersistencia(observacoes) {
    return observacoes.map((obs, index) => ({
        numSeqObs: index < 98 ? index + 1 : index + 2,
        txtObs: obs.descricao || '-',
        indPedido: obs.pedido ? 1 : 0,
        indNf: obs.nota ? 1 : 0,
        indRegistro: obs.registro ? 1 : 0,
        indCr: obs.financeiro ? 1 : 0
    }));
}
