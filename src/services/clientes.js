import { unimedApi } from "../config/apis.js";

export function getClientes() {
    return unimedApi.get("clientes");
}

const CLIENTES_CACHE_TTL = 5 * 60 * 1000;
let _clientesCache = null;
let _clientesRequest = null;

export function getAllClientesCached() {
    if (_clientesCache && _clientesCache.expiraEm > Date.now()) {
        return Promise.resolve(_clientesCache.clientes);
    }

    if (_clientesRequest) return _clientesRequest;

    _clientesRequest = getClientes()
        .then(response => {
            const resposta = response.data || {};
            const clientes = Array.isArray(resposta) ? resposta : (resposta.items || []);
            _clientesCache = { clientes, expiraEm: Date.now() + CLIENTES_CACHE_TTL };
            return clientes;
        })
        .finally(() => { _clientesRequest = null; });

    return _clientesRequest;
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
