import { consultarComCache, getConsultaCached } from './consultaCache';

export function getAllCondPgtoCached() {
    return consultarComCache('condPgto|todos', async () => {
        const condicoes = [];
        let hasMore;
        do {
            const { data } = await getCondPgto({ offset: condicoes.length, limit: 500 });
            const items = Array.isArray(data) ? data : (data?.items || []);
            hasMore = !Array.isArray(data) && Boolean(data?.hasMore);
            if (hasMore && items.length === 0) {
                throw new Error('Paginação de condições de pagamento inconsistente.');
            }
            condicoes.push(...items);
        } while (hasMore);
        return condicoes;
    });
}

export function filtrarCondicoesPagamento(condicoes, filtro) {
    const normalizar = valor => String(valor ?? '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const termo = normalizar(filtro);
    if (!termo) return condicoes;
    const partes = termo.split(/[\s%]+/).filter(Boolean)
        .map(parte => parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const padrao = new RegExp(partes.join('.*'));
    return condicoes.filter(condicao =>
        [condicao.cod_cond_pgto, condicao.des_cond_pgto]
            .some(valor => padrao.test(normalizar(valor))));
}

export function getCondPgto({ offset = 0, limit = 25 }) {
    return getConsultaCached("condPgto", {
        params: { offset, limit }
    });
}

export function getCondPgtoByFilter({ filtro, offset = 0, limit = 25 }) {
    return getConsultaCached(`condPgto/${filtro}`, {
        params: { offset, limit }
    });
}
