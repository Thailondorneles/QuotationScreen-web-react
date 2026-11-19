export function itemParaAcordo(item, origem) {
    const novo = origem === 'novo';
    const venda = novo ? item : item.venda;
    const precoVenda = novo ? item.ultimoPreco : venda?.ultimaQuantidade > 0 ? venda.ultimoValor / venda.ultimaQuantidade : null;
    return {
        codigo: String(novo ? item.codigo : item.cod_item),
        descricao: novo ? item.descricao : item.des_item,
        marca: (novo ? item.marca : item.cod_completo) || '',
        origem: novo ? 'Novo item' : 'Ampliar contrato',
        quantidade: Math.max(1, Math.ceil(novo ? item.media : Math.max(item.media || 0, item.quantidade || 0))),
        preco: Number(Number(precoVenda ?? item.vlr_uni_bruto ?? 0).toFixed(2))
    };
}

export function numeroAcordo(valor) {
    const texto = String(valor ?? '').trim();
    if (!texto) return NaN;
    return Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
}

export function validarItensAcordo(itens) {
    return itens.length > 0 && itens.every(item => String(item.descricao || '').trim()
        && Number.isFinite(numeroAcordo(item.quantidade)) && numeroAcordo(item.quantidade) > 0
        && Number.isFinite(numeroAcordo(item.preco)) && numeroAcordo(item.preco) >= 0);
}
