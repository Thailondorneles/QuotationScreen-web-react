import { unimedApi } from "../config/apis.js";

export function getEstoqueDisponivel({ codItem, codUnidade, offset = 0, limit = 25 }) {
    return unimedApi.get(`estoqueDisponivel/${codItem}/${codUnidade}`, {
        params: { offset, limit }
    });
}
