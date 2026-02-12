import { unimedApi } from "../config/apis.js";

export function getOperacoes({ offset = 0, limit = 25 }) {
    return unimedApi.get("operacoes", {
        params: { offset, limit }
    });
}

export function getOperacoesByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`operacoes/${filtro}`, {
        params: { offset, limit }
    });
}
