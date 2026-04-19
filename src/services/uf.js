import { unimedApi } from "../config/apis.js";

export function getUf({ offset = 0, limit = 25 }) {
    return unimedApi.get("uf", {
        params: { offset, limit }
    });
}

export function getUfByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`uf/${filtro}`, {
        params: { offset, limit }
    });
}
