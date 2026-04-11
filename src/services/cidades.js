import { unimedApi } from "../config/apis.js";

export function getCidades({ offset = 0, limit = 25 }) {
    return unimedApi.get("cidades", {
        params: { offset, limit }
    });
}

export function getCidadesByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`cidades/${filtro}`, {
        params: { offset, limit }
    });
}
