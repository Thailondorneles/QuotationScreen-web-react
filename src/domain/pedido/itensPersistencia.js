function decimal(valor, campo) {
    if (valor === '' || valor == null) return null;
    const texto = String(valor).trim();
    const numero = Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
    if (!Number.isFinite(numero)) throw new Error(`Valor inválido em ${campo}.`);
    return numero;
}

export function montarItensPersistencia(itensPedido) {
    const grupos = new Map();
    for (const item of itensPedido) {
        if (!Number.isSafeInteger(Number(item.numItem)) || Number(item.numItem) < 1 || ![201, 203].includes(Number(item.unidade)) || !Number.isSafeInteger(Number(item.cod_item)) || Number(item.cod_item) < 1) {
            throw new Error('Existe um item sem número, produto ou unidade válida para salvar.');
        }
        const grupo = grupos.get(Number(item.numItem)) || new Map();
        if (grupo.has(Number(item.unidade)) || [...grupo.values()].some(codigo => codigo !== Number(item.cod_item))) {
            throw new Error(`O item ${item.numItem} possui registros duplicados ou produtos divergentes entre as unidades.`);
        }
        grupo.set(Number(item.unidade), Number(item.cod_item));
        grupos.set(Number(item.numItem), grupo);
    }
    for (const [numItem, unidades] of grupos) {
        if (unidades.size !== 2) throw new Error(`O item ${numItem} está sem os dados de uma unidade. Adicione-o novamente antes de salvar, incluindo a alternativa desmarcada.`);
    }
    // Salva todas as alternativas, inclusive as unidades desmarcadas.
    return itensPedido.map(item => ({
        numItem: Number(item.numItem),
        codUnidade: Number(item.unidade),
        codItem: Number(item.cod_item),
        indSelecionado: item.selecionado ? 1 : 0,
        qtdNegociada: decimal(item.quantidade, 'quantidade'),
        codListaPreco: decimal(item.codListaPreco, 'lista de preço'),
        vlrUnitario: decimal(item.valorLista, 'preço negociado'),
        vlrListaOriginal: decimal(item.valorListaOriginal, 'preço original'),
        vlrCustoCotacao: decimal(item.vlrMedio, 'custo')
    })).sort((a, b) => a.numItem - b.numItem || a.codUnidade - b.codUnidade);
}
