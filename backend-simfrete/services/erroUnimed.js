function mensagemErroUnimed(err) {
  const status = err.response?.status;
  const data = err.response?.data;
  const detalhes = data && typeof data === 'object'
    ? [data.erro, data.mensagem, data.message, data.title, data.detail]
        .filter(valor => typeof valor === 'string' && valor.trim())
    : typeof data === 'string' && !/<(?:!doctype|html|body)\b/i.test(data)
      ? [data.trim()] : [];
  const detalhe = [...new Set(detalhes)]
    .map(texto => texto.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean).join(' — ').slice(0, 600);
  if (status) return `ORDS retornou HTTP ${status}${detalhe ? `: ${detalhe}` : '. Verifique o handler no ORDS.'}`;
  if (err.code === 'ECONNABORTED') return 'Tempo limite ao acessar o ORDS. Consulte o pedido antes de tentar excluir novamente.';
  return 'Não foi possível conectar ao ORDS.';
}

module.exports = { mensagemErroUnimed };
