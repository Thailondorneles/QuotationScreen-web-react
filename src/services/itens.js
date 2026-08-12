import { unimedApi } from "../config/apis.js";

const LOTES_CACHE_TTL = 5 * 60 * 1000;
let lotesCache = null;
let lotesRequest = null;

export function getItens() {
    return unimedApi.get("itens");
}

export function getItensDetalhados({ codItens }) {
    const codigos = [...new Set(codItens)]
        .map(codigo => String(codigo ?? '').trim())
        .filter(Boolean);

    return unimedApi.get(`itensDetalhados/${codigos.join(',')}`);
}

export function getItensClassificacao({ codItens }) {
    const codigos = [...new Set(codItens)]
        .map(codigo => String(codigo ?? '').trim())
        .filter(Boolean);

    if (!codigos.length) {
        return Promise.resolve({ data: { items: [] } });
    }

    return unimedApi.get(`itensClassificacao/${codigos.join(',')}`);
}

export function getItensLotes() {
    return unimedApi.get('itensLotes');
}

export function getItensLotesCached() {
    if (lotesCache && lotesCache.expiraEm > Date.now()) {
        return Promise.resolve(lotesCache.itens);
    }

    if (lotesRequest) return lotesRequest;

    lotesRequest = getItensLotes()
        .then(response => {
            const resposta = response.data || {};
            const itens = Array.isArray(resposta) ? resposta : (resposta.items || []);
            lotesCache = { itens, expiraEm: Date.now() + LOTES_CACHE_TTL };
            return itens;
        })
        .finally(() => { lotesRequest = null; });

    return lotesRequest;
}

export function getItensAcordos({ codItem, codCliente, offset = 0, limit = 25 }) {
    return unimedApi.get(`itensAcordos/${codItem}/${codCliente}`, {
        params: { offset, limit }
    });
}

export function getItemUltimaCompra({ codItem, codCliente, offset = 0, limit = 25 }) {
    return unimedApi.get(`itensUltimaCompra/${codItem}/${codCliente}`, {
        params: { offset, limit }
    });
}
