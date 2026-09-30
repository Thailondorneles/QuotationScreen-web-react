import { getClientesItensNotas } from "../../services/clientesItensNotas";
import { useEffect } from 'react';
import { getClientesUltimasCompras, agruparUltimasComprasPorItem } from "../../services/clientes.js";
import { getItensClassificacao, getItensLotesCached } from "../../services/itens.js";

export function useConsultasItensPedido({
    setItensPedido,
    ultimasComprasClienteMap,
    cliente,
    setUltimasComprasClienteMap,
    parametrosCarregados,
    setNotasCliente,
    codigosItensPedido,
    setLotesProximosMap,
    classificacoesItemCache
}) {
    useEffect(() => {
        setItensPedido(prev => prev.map(item => ({
            ...item,
            ultimaCompraItemDasUltimasCompras: ultimasComprasClienteMap[item.cod_item] || null
        })));
    }, [ultimasComprasClienteMap]);

    useEffect(() => {
        const codigo = cliente?.cod_pessoa;
        if (!codigo) {
            setUltimasComprasClienteMap({});
            return;
        }
        let ativo = true;
        getClientesUltimasCompras({ codCliente: codigo })
            .then(response => {
                if (ativo) setUltimasComprasClienteMap(agruparUltimasComprasPorItem(response.data?.items || []));
            })
            .catch(() => {});
        return () => {
            ativo = false;
        };
    }, [cliente?.cod_pessoa, parametrosCarregados]);

    useEffect(() => {
        const codigo = cliente?.cod_pessoa;
        if (!codigo) { setNotasCliente(null); return; }
        let ativo = true;
        setNotasCliente({ codigo, status: 'carregando' });
        getClientesItensNotas(codigo)
            .then(items => { if (ativo) setNotasCliente({ codigo, status: 'pronto', items }); })
            .catch(() => { if (ativo) setNotasCliente({ codigo, status: 'erro' }); });
        return () => { ativo = false; };
    }, [cliente?.cod_pessoa]);

    useEffect(() => {
        if (!codigosItensPedido) return;
        getItensLotesCached()
            .then(itens => setLotesProximosMap((itens || []).reduce((acc, item) => {
                const codItem = String(item.cod_item ?? '');
                if (codItem) acc[codItem] = item;
                return acc;
            }, {})))
            .catch(() => setLotesProximosMap({}));
    }, [codigosItensPedido]);

    useEffect(() => {
        const codItens = codigosItensPedido ? codigosItensPedido.split(',') : [];
        const codItensSemCache = codItens.filter(codItem => !classificacoesItemCache.current.has(codItem));

        if (!codItensSemCache.length) return;

        let ativo = true;

        getItensClassificacao({ codItens: codItensSemCache })
            .then(response => {
                if (!ativo) return;

                (response.data.items || []).forEach(item => {
                    classificacoesItemCache.current.set(String(item.cod_item), item.des_geral ?? null);
                });

                codItensSemCache.forEach(codItem => {
                    if (!classificacoesItemCache.current.has(codItem)) {
                        classificacoesItemCache.current.set(codItem, null);
                    }
                });

                setItensPedido(prev => prev.map(item => {
                    const classificacao = classificacoesItemCache.current.get(String(item.cod_item)) ?? null;
                    return item.classificacao === classificacao ? item : { ...item, classificacao };
                }));
            })
            .catch(() => {});

        return () => { ativo = false; };
    }, [codigosItensPedido]);
}
