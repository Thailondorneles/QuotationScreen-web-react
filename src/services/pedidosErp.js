import axios from 'axios';
import { unimedApi } from '../config/apis.js';

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

export function enviarPedidoErp(payload) {
    return pedidosErpApi.post('/api/pedidos/enviar-erp', payload);
}

export async function consultarPedidosPorSequencia(numSeq) {
    if (numSeq === undefined || numSeq === null) return [];

    // O pedido pode levar alguns instantes para ficar disponível após a integração.
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
        try {
            const response = await unimedApi.get(
                `ConsultaPedidosSeq/${encodeURIComponent(numSeq)}`,
                { timeout: 5000 }
            );
            const pedidos = Array.isArray(response.data?.items)
                ? response.data.items.filter(pedido =>
                    String(pedido.txt_obs).trim() === String(numSeq) &&
                    pedido.num_pedido != null &&
                    pedido.cod_unidade != null &&
                    pedido.cod_compl != null
                )
                : [];
            if (pedidos.length) return pedidos;
        } catch {
            // Uma falha na consulta não desfaz o envio já confirmado pelo ERP.
        }
        if (tentativa < 2) {
            await new Promise(resolve => setTimeout(resolve, 700));
        }
    }
    return [];
}
