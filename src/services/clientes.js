import { unimedApi } from "../config/apis.js";

export function getClientes({ offset = 0, limit = 25 }) {
    return unimedApi.get("clientes", {
        params: { offset, limit }
    });
}

export function getClienteByFilter({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`clientes/${filtro}`, {
        params: { offset, limit }
    });
}

export function getClientesComentarios({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`clientesComentarios/${filtro}`, {
        params: { offset, limit }
    });
}
