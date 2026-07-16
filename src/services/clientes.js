import { unimedApi } from "../config/apis.js";

export function getClientes() {
    return unimedApi.get("clientes");
}

export function getClienteByFilter({ filtro }) {
    return unimedApi.get(`clientes/${encodeURIComponent(filtro)}`);
}

export function getClienteDetalhado({ codPessoa }) {
    return unimedApi.get(`ClienteDetalhado/${encodeURIComponent(codPessoa)}`);
}

export function getClientesComentarios({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`clientesComentarios/${filtro}`, {
        params: { offset, limit }
    });
}

export function getClientesHistorico({ filtro, offset = 0, limit = 25 }) {
    return unimedApi.get(`clientesHistorico/${filtro}`, {
        params: { offset, limit }
    });
}
