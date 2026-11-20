export function formatarPrazoFrete(cotacao) {
    if (cotacao?.prazo == null) return '-';
    const tipo = cotacao.prazoTabelaUteis === true ? ' úteis'
        : cotacao.prazoTabelaUteis === false ? ' corridos' : '';
    return `${cotacao.prazo} dias${tipo}`;
}
