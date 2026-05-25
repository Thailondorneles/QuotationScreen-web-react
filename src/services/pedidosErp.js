import axios from 'axios';

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
