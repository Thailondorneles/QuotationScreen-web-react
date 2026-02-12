import { unimedApi } from "../config/apis.js";

export function getItens({ offset = 0, limit = 25 }) {
    return unimedApi.get("itens", {
        params: { offset, limit }
    });
}

export function getItemByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`itens/${filtro}`, {
        params: { offset, limit }
    });
}
