import { parametros } from '../config/parametrosAplicacao';
import { unimedApi } from "../config/apis.js";
import { consultarComCache } from './consultaCache';

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

export async function obterClienteParaProposta(cliente) {
    const codigo = String(cliente.cod_pessoa);
    const [response, clientes] = await Promise.all([
        getClienteByFilter({ filtro: codigo }).catch(() => null),
        getAllClientesCached()
    ]);
    const cadastro = clientes.find(item => String(item.cod_pessoa) === codigo) || {};
    const contato = response?.data?.items?.find(item => String(item.cod_pessoa) === codigo) || {};
    const cidade = [cadastro.des_cidade, cliente.des_cidade, contato.des_cidade]
        .find(valor => String(valor ?? '').trim() !== '') || '';
    return { ...cliente, ...contato, des_cidade: cidade };
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

export function getClientesUltimasCompras({ codCliente }) {
    return consultarComCache(`historicoItens|${codCliente}`, () =>
        unimedApi.get(`clientesUltimaCompra/${encodeURIComponent(codCliente)}`));
}

export function agruparUltimasComprasPorItem(items) {
    if (!Array.isArray(items)) return {};

    const groupedByItem = {};

    items.forEach(item => {
        const codItem = item.cod_item;
        if (!groupedByItem[codItem]) {
            groupedByItem[codItem] = [];
        }
        groupedByItem[codItem].push(item);
    });

    return Object.fromEntries(
        Object.entries(groupedByItem).map(([codItem, compras]) => [
            codItem,
            compras
                .sort((a, b) => new Date(b.dta_emissao) - new Date(a.dta_emissao))
                .slice(0, parametros.HISTORICO_COMPRAS_POR_ITEM)
        ])
    );
}

export function obterUltimaCompraItem(ultimasComprasMap, codItem) {
    const compras = ultimasComprasMap[codItem];
    return Array.isArray(compras) && compras.length > 0 ? compras[0] : null;
}
