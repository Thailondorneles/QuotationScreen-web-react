import { unimedApi } from "../config/apis.js";

function normalizarRespostaCeps(data) {
    if (Array.isArray(data?.items)) {
        return data;
    }

    if (Array.isArray(data)) {
        return {
            items: data,
            hasMore: false,
            count: data.length
        };
    }

    if (data && typeof data === 'object') {
        return {
            items: [data],
            hasMore: false,
            count: 1
        };
    }

    return {
        items: [],
        hasMore: false,
        count: 0
    };
}

export function getCeps({ offset = 0, limit = 25 }) {
    return unimedApi.get("ceps", {
        params: { offset, limit }
    }).then((response) => ({
        ...response,
        data: normalizarRespostaCeps(response.data)
    }));
}

export function getCepsByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`ceps/${filtro}`, {
        params: { offset, limit }
    }).then((response) => ({
        ...response,
        data: normalizarRespostaCeps(response.data)
    }));
}
