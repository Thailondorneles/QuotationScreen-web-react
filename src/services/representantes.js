import { unimedApi } from "../config/apis.js";

export function getRepresentantesByCliente({ filtro, offset = 0, limit = 25 }) {

    return unimedApi.get(`representantesCliente/${filtro}`, {
        params: { offset, limit }
    });
}


export function getRepresentantesByIdCliente({ cliente, representante, offset = 0, limit = 25 }) {
    return unimedApi.get(`representantes/${representante}/${cliente}`, {
        params: { offset, limit }
    });
}