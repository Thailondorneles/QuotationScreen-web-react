import { unimedApi } from '../config/apis';


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

export async function salvarIntegracaoPedido(payload) {
    try {
        for (const campo of ['numPedidoMatriz', 'numPedidoFilial']) {
            if (payload[campo] != null && !/^\d+\/\d+$/.test(String(payload[campo]))) {
                throw new Error(`${campo} inválido: esperado número/complemento. Nenhuma atualização foi enviada.`);
            }
        }
        console.log('[EsPePedidos/integracao] Requisição:', {
            metodo: 'POST',
            url: unimedApi.getUri({ url: 'EsPePedidos/integracao' })
        });
        console.log('[EsPePedidos/integracao] JSON enviado:', JSON.stringify(payload, null, 2));
        const { data } = await unimedApi.post('EsPePedidos/integracao', payload);
        if (data?.success === false || data?.sucesso === false || data?.erro) {
            throw new Error(data.erro || 'Atualização recusada pela API.');
        }
        if (typeof data === 'string' && /<!doctype|<html/i.test(data)) {
            throw new Error('A API retornou uma página HTML.');
        }
        return data;
    } catch (error) {
        console.error('[EsPePedidos/integracao] Falha no POST:', {
            metodo: 'POST',
            url: unimedApi.getUri({ url: 'EsPePedidos/integracao' }),
            status: error.response?.status,
            resposta: error.response?.data,
            mensagem: error.message
        });
        throw new Error(`O NL já retornou os pedidos, mas não foi possível registrar a integração da cotação ${payload.numSeqPedido}. Confira os pedidos antes de repetir o envio. ${error.response?.data?.erro || error.message}`);
    }
}
