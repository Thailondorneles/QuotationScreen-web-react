import axios from 'axios';
import { unimedApi } from '../config/apis.js';
import { getPortadorPosicao } from './definePortador.js';

const pedidosErpApiBaseUrl = process.env.REACT_APP_SIMFRETE_API_BASE_URL;

if (!pedidosErpApiBaseUrl) {
    throw new Error('REACT_APP_SIMFRETE_API_BASE_URL nao configurada.');
}

const pedidosErpApi = axios.create({
    baseURL: pedidosErpApiBaseUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export async function enviarPedidoErp(payload) {
    const portadorPosicao = await getPortadorPosicao(payload.pePedidos || {});
    return pedidosErpApi.post('/api/pedidos/enviar-erp', {
        ...payload,
        pePedidos: {
            ...payload.pePedidos,
            ...portadorPosicao
        }
    });
}

const chavePedido = pedido => `${pedido.cod_unidade}:${pedido.num_pedido}/${pedido.cod_compl}`;

// Antes de enviar, a consulta deve concluir: sem essa refer?ncia n?o podemos
// distinguir pedidos de vers?es anteriores que compartilham a observa??o.
export async function consultarPedidosExistentes(numSeq) {
    const pedidos = [];
    let offset = 0;
    while (true) {
        const { data } = await unimedApi.get(`ConsultaPedidosSeq/${encodeURIComponent(numSeq)}`, {
            timeout: 5000, params: { offset, limit: 500 }
        });
        if (!Array.isArray(data?.items)) throw new Error('Formato inv?lido na consulta dos pedidos do NL.');
        pedidos.push(...data.items.filter(pedido =>
            String(pedido.txt_obs).trim() === String(numSeq) &&
            pedido.num_pedido != null && pedido.cod_unidade != null && pedido.cod_compl != null));
        if (!data.hasMore) return pedidos;
        if (!data.items.length) throw new Error('Pagina??o inv?lida na consulta dos pedidos do NL.');
        offset += data.items.length;
    }
}

export async function consultarPedidosPorSequencia(numSeq, unidadesEsperadas = [], anteriores = []) {
    if (numSeq == null) return [];
    const ignorar = new Set(anteriores.map(chavePedido));
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
        try {
            const pedidos = (await consultarPedidosExistentes(numSeq)).filter(pedido =>
                !ignorar.has(chavePedido(pedido)) &&
                (!unidadesEsperadas.length || unidadesEsperadas.includes(Number(pedido.cod_unidade))));
            // Mais de um pedido novo na mesma unidade ? amb?guo: n?o escolher arbitrariamente.
            const confirmados = pedidos.filter(pedido => pedidos.filter(outro =>
                Number(outro.cod_unidade) === Number(pedido.cod_unidade)).length === 1);
            if (unidadesEsperadas.every(unidade => confirmados.some(p => Number(p.cod_unidade) === unidade)) || tentativa === 2) {
                return confirmados;
            }
        } catch {
            // A consulta pode ser repetida; o envio ao ERP nunca ? repetido aqui.
        }
        if (tentativa < 2) await new Promise(resolve => setTimeout(resolve, 700));
    }
    return [];
}
