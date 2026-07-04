import { useRef, useState } from 'react';

const cacheLov = new Map();
const requisicoesLov = new Map();
const CACHE_TTL_PADRAO = 5 * 60 * 1000;

export function useLovPagination({ fetchFn, limit = 25, cacheKey, cacheTtl = CACHE_TTL_PADRAO }) {
    const [data, setData] = useState([]);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [initialized, setInitialized] = useState(false);
    const [atualizadoEm, setAtualizadoEm] = useState(0);
    const ultimaRequisicao = useRef(0);

    function montarChave(filtro, novoOffset) {
        if (!cacheKey) return null;
        return `${cacheKey}|${String(filtro ?? '').trim().toUpperCase()}|${novoOffset}|${limit}`;
    }

    function aplicarResultado(resultado, novoOffset) {
        setData(resultado.items);
        setOffset(novoOffset);
        setHasMore(Boolean(resultado.hasMore));
        setTotal(typeof resultado.count === 'number'
            ? resultado.count
            : novoOffset + resultado.items.length);
        setInitialized(true);
        setAtualizadoEm(Date.now());
    }

    async function carregarResultado({ filtro, novoOffset }) {
        const chave = montarChave(filtro, novoOffset);
        const cacheAtual = chave ? cacheLov.get(chave) : null;

        if (cacheAtual && cacheAtual.expiraEm > Date.now()) {
            return cacheAtual.resultado;
        }

        if (chave && requisicoesLov.has(chave)) {
            return requisicoesLov.get(chave);
        }

        const requisicao = fetchFn({ filtro, offset: novoOffset, limit })
            .then(response => {
                const resposta = response.data || {};
                const resultado = {
                    items: resposta.items || [],
                    hasMore: resposta.hasMore,
                    count: resposta.count
                };

                if (chave) {
                    cacheLov.set(chave, {
                        resultado,
                        expiraEm: Date.now() + cacheTtl
                    });
                }

                return resultado;
            })
            .finally(() => {
                if (chave) requisicoesLov.delete(chave);
            });

        if (chave) requisicoesLov.set(chave, requisicao);
        return requisicao;
    }

    async function buscar({ filtro = '', novoOffset = 0 }) {
        const idRequisicao = ultimaRequisicao.current + 1;
        ultimaRequisicao.current = idRequisicao;
        setLoading(true);

        try {
            const resultado = await carregarResultado({ filtro, novoOffset });

            if (idRequisicao === ultimaRequisicao.current) {
                aplicarResultado(resultado, novoOffset);
            }
        } finally {
            if (idRequisicao === ultimaRequisicao.current) {
                setLoading(false);
            }
        }
    }

    return {
        data,
        offset,
        total,
        loading,
        initialized,
        precisaAtualizar: !initialized || Date.now() - atualizadoEm >= cacheTtl,
        podeAvancar: hasMore,
        podeVoltar: offset > 0,
        buscar
    };
}
