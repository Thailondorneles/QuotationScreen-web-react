const INATIVIDADE = 'SESSAO_INATIVIDADE_MINUTOS';
const LIMITE = 'SESSAO_LIMITE_ABSOLUTO_MINUTOS';

function criarPrazosSessao(api) {
  let cache;
  let pendente;
  let ultimaGravacao = Promise.resolve();

  function invalidar() {
    cache = undefined;
    pendente = undefined;
  }

  async function consultar() {
    const valores = new Map();
    let offset = 0;
    while (true) {
      const { data } = await api.get('parsConf', { params: { offset, limit: 500 }, timeout: 2500 });
      if (!Array.isArray(data?.items) || (data.hasMore === true && !data.items.length)) {
        throw new Error('Resposta invalida dos parametros de sessao.');
      }
      for (const item of data.items) valores.set(item.des_conf, item.parametro);
      if (data.hasMore !== true || (valores.has(INATIVIDADE) && valores.has(LIMITE))) break;
      offset += data.items.length;
    }
    const inatividade = Number(valores.get(INATIVIDADE) ?? 30);
    const limite = Number(valores.get(LIMITE) ?? 480);
    if (!Number.isSafeInteger(inatividade) || inatividade < 1 ||
        !Number.isSafeInteger(limite) || limite < inatividade || limite > 525600) {
      throw new Error('Prazos de sessao invalidos na ES_PARS_CONF.');
    }
    return { inatividade_minutos: inatividade, limite_absoluto_minutos: limite };
  }

  function carregar() {
    if (cache?.ate > Date.now()) return Promise.resolve(cache.prazos);
    if (pendente) return pendente;
    const consulta = consultar().then(prazos => {
      if (pendente === consulta) cache = { prazos, ate: Date.now() + 30000 };
      return prazos;
    }).finally(() => {
      if (pendente === consulta) pendente = undefined;
    });
    pendente = consulta;
    return consulta;
  }

  function atualizar(id, valor) {
    const gravacao = ultimaGravacao.then(async () => {
      const minutos = Number(valor);
      const atual = await carregar();
      const inatividade = id === 50 ? minutos : atual.inatividade_minutos;
      const limite = id === 51 ? minutos : atual.limite_absoluto_minutos;
      if (!/^\d+$/.test(valor) || !Number.isSafeInteger(minutos) ||
          inatividade < 1 || limite < inatividade || limite > 525600) return null;
      const resposta = await api.put(`parsConf/${id}`, { parametro: String(minutos) });
      invalidar();
      return resposta;
    });
    ultimaGravacao = gravacao.catch(() => {});
    return gravacao;
  }

  return { carregar, atualizar };
}

module.exports = { criarPrazosSessao };
