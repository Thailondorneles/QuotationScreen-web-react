import { unimedApi } from "../config/apis.js";

export function getCeps({ offset = 0, limit = 25 }) {
    return unimedApi.get("ceps", {
        params: { offset, limit }
    });
}

export function getCepsByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`ceps/${filtro}`, {
        params: { offset, limit }
    });
}
