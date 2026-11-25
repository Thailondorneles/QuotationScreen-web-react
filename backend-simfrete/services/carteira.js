function criarConsultaCarteira(api) {
  const verificacoes = new Map();

  async function consultarEscopo(recurso, params, representante) {
    const resposta = await api.get(recurso, { params: { ...params, cod_rep_externo: representante } });
    if (!Array.isArray(resposta.data?.items) || resposta.data.items.some(
      item => String(item?.cod_rep_externo ?? '').trim() !== String(representante)
    )) {
      throw new Error('Resposta do ORDS fora do escopo do representante.');
    }
    return resposta;
  }

  function pertenceACarteira(cliente, representante) {
    const chave = `${representante}:${cliente}`;
    if (verificacoes.has(chave)) return verificacoes.get(chave);

    const consulta = (async () => {
      let offset = 0;
      while (true) {
        const { data } = await consultarEscopo('clientes', { offset, limit: 500 }, representante);
        if (data.items.some(item => String(item.cod_pessoa) === cliente)) return true;
        if (data.hasMore !== true) return false;
        if (!data.items.length) throw new Error('Paginacao invalida da carteira.');
        offset += data.items.length;
      }
    })().finally(() => verificacoes.delete(chave));
    verificacoes.set(chave, consulta);
    return consulta;
  }

  return async function consultar(recurso, query, representante, somenteCarteira = false) {
    const nome = recurso.replace(/\/{2,}/g, '/').replace(/\/$/, '').toLowerCase();
    const listagem = nome === 'clientes' || nome === 'demandacontratos';
    const detalhe = /^(clientes|clientedetalhado|representantescliente)\/([^/]+)$/.exec(nome);
    const vendas = nome === 'notassaida';
    if (!listagem && !detalhe && !vendas) return somenteCarteira ? null : api.get(recurso, { params: query });
    if (!Number.isSafeInteger(representante) || representante <= 0) return null;

    if (listagem) {
      const { offset, limit, situacao, cod_cliente } = query;
      if (nome === 'demandacontratos' && cod_cliente !== undefined &&
          (typeof cod_cliente !== 'string' || !/^[0-9]+$/.test(cod_cliente) ||
          !await pertenceACarteira(cod_cliente, representante))) return null;
      const params = nome === 'clientes' ? { offset, limit } : { offset, limit, situacao, cod_cliente };
      return consultarEscopo(recurso, params, representante);
    }

    const cliente = detalhe ? detalhe[2] : query.cod_cliente;
    if (typeof cliente !== 'string' || !/^[0-9]+$/.test(cliente) ||
        !await pertenceACarteira(cliente, representante)) return null;
    const { offset, limit, data_inicio, data_fim } = query;
    const params = vendas ? { cod_cliente: cliente, data_inicio, data_fim, offset, limit } : { offset, limit };
    return api.get(recurso, { params });
  };
}

module.exports = { criarConsultaCarteira };
