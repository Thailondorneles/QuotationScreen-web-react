import axios from 'axios';
import { unimedApi } from '../config/apis';

const backend = axios.create({ baseURL: process.env.REACT_APP_SIMFRETE_API_BASE_URL, timeout: 30000 });

export function normalizarPedido(registro) {
    return Object.fromEntries(Object.entries(registro).map(([chave, valor]) => [
        chave.includes('_') ? chave.toLowerCase().replace(/_([a-z])/g, (_, letra) => letra.toUpperCase()) : chave,
        valor
    ]));
}

export function extrairRegistros(data) {
    return (Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : data ? [data] : [])
        .map(normalizarPedido);
}

export async function listarPedidos(params) {
    const { data } = await unimedApi.get('EsPePedidos', { params });
    return { items: extrairRegistros(data), hasMore: Boolean(data?.hasMore) };
}

export async function consultarPedido(id) {
    const { data } = await unimedApi.get(`EsPePedidos/${encodeURIComponent(id)}`);
    const pedido = extrairRegistros(data).find(item => String(item.numSeqPedido) === String(id));
    if (!pedido) throw new Error('Cotação não encontrada.');
    return pedido;
}

export async function reservarSequenciaPedido() {
    try {
        const { data } = await backend.post('/api/pedidos/sequencia');
        if (!Number.isSafeInteger(Number(data?.numSeqPedido)) || Number(data.numSeqPedido) <= 0) {
            throw new Error('O backend não retornou um sequencial válido.');
        }
        return data.numSeqPedido;
    } catch (error) {
        if (error.response?.status === 404) {
            throw new Error('A rota POST /api/pedidos/sequencia não foi encontrada no backend. Reinicie o backend-simfrete com o código atualizado e confira o endereço configurado para ele.');
        }
        throw new Error(`Não foi possível reservar o sequencial: ${error.response?.data?.erro || error.message}`);
    }
}

export async function salvarCabecalhoPedido(payload) {
    try {
        const { data } = await unimedApi.post('EsPePedidosIns', payload);
        if (data?.sucesso === false || data?.erro) throw new Error(data.erro || 'Não foi possível salvar a cotação.');
        if (typeof data === 'string' && /<!doctype|<html/i.test(data)) throw new Error('A API retornou uma página HTML em vez da confirmação de gravação.');
        return data;
    } catch (error) {
        if (error.response?.status === 404) {
            const origem = error.response.data?.origem === 'ORDS' ? 'no ORDS' : 'no endereço configurado da API';
            throw new Error(`POST EsPePedidosIns não encontrado ${origem} (404). Confira a publicação do endpoint e o caminho /ords/nl/unimed/EsPePedidosIns. O sequencial foi mantido para uma nova tentativa.`);
        }
        throw new Error(`Não foi possível salvar o cabeçalho: ${error.response?.data?.erro || error.message}`);
    }
}
