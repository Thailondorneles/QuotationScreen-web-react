import { unimedApi } from "../config/apis.js";

export function getCondPgto({ offset = 0, limit = 25 }) {
    return unimedApi.get("condPgto", {
        params: { offset, limit }
    });
}

export function getCondPgtoByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`condPgto/${filtro}`, {
        params: { offset, limit }
    });
}
