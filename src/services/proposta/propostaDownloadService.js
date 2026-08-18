export function sanitizarNomeArquivo(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
}

export function nomeArquivoProposta(proposta, extensao) {
    const cliente = sanitizarNomeArquivo(proposta.cliente.nome || proposta.cliente.codigo || 'cliente');
    const data = proposta.emissao.toISOString().slice(0, 10);
    return `Proposta_${proposta.empresa.unidade}_${cliente}_${data}.${extensao}`;
}

export function baixarBlob(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
