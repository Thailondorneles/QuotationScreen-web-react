import { unimedApi } from "../config/apis.js";

export function getItens({ offset = 0, limit = 25 }) {
    return unimedApi.get("itens", {
        params: { offset, limit }
    });
}

export function getItemByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`itens/${encodeURIComponent(filtro)}`, {
        params: { offset, limit }
    });
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
