import { useState } from 'react';

export function useLovPagination({ fetchFn, limit = 25 }) {
    const [data, setData] = useState([]);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    async function buscar({ filtro = '', novoOffset = 0 }) {
        setLoading(true);

        const response = await fetchFn({
            filtro,
            offset: novoOffset,
            limit
        });

        const { items, hasMore, count } = response.data;

        setData(items);
        setOffset(novoOffset);
        setHasMore(hasMore);

        if (typeof count === 'number') {
            setTotal(count);
        } else {
            setTotal(novoOffset + items.length);
        }

        setLoading(false);
    }

    return {
        data,
        offset,
        total,
        loading,
        podeAvancar: hasMore,
        podeVoltar: offset > 0,
        buscar
    };
}
