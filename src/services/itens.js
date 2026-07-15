import { unimedApi } from "../config/apis.js";

export function getItens() {
    return unimedApi.get("itens");
}

export function getItemByFilter({ filtro }) {
    return unimedApi.get(`itens/${encodeURIComponent(filtro)}`);
}

export function getItensDetalhados({ codItens }) {
    const codigos = [...new Set(codItens)]
        .map(codigo => String(codigo ?? '').trim())
        .filter(Boolean);

    return unimedApi.get(`itensDetalhados/${codigos.join(',')}`);
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
