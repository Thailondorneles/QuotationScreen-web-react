import { unimedApi } from "../config/apis.js";

function normalizarRespostaEnderecos(data) {
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

export function getEnderecosPadraoByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`psPessoasPadrao/${filtro}`, {
        params: { offset, limit }
    }).then((response) => ({
        ...response,
        data: normalizarRespostaEnderecos(response.data)
    }));
}
