import { unimedApi } from '../config/apis';
import { normalizarPedido } from './pedidosWeb';

export async function consultarEnderecoPedido(pedido) {
    let data;
    try {
        ({ data } = await unimedApi.get(`EsPeEnderecos/${encodeURIComponent(pedido.numSeqPedido)}`));
    } catch (error) {
        if (error.response?.status === 404) return null;
        throw new Error(`Não foi possível consultar o endereço do pedido. ${error.message}`);
    }
    const registros = Array.isArray(data) ? data : data?.items;
    if (!Array.isArray(registros)) throw new Error('A consulta do endereço retornou um formato inválido.');
    const enderecos = registros.map(normalizarPedido).filter(endereco =>
        String(endereco.numSeqPedido) === String(pedido.numSeqPedido) &&
        (pedido.codVersCotacao == null || endereco.codVersCotacao == null ||
            String(endereco.codVersCotacao) === String(pedido.codVersCotacao))
    );
    if (enderecos.length > 1) throw new Error('A consulta retornou mais de um endereço para a cotação.');
    return enderecos[0] || null;
}

export async function salvarEnderecoPedido(payload) {
    try {

        const { data } = await unimedApi.post('EsPeEnderecos', payload);

        if (data?.sucesso === false || data?.erro) throw new Error(data.erro || 'Gravação recusada.');
        if (typeof data === 'string' && /<!doctype|<html/i.test(data)) throw new Error('A API retornou uma página HTML.');
        return data;
    } catch (error) {

        throw new Error(`Não foi possível salvar o endereço do pedido. A cotação permanece aberta para tentar novamente. ${error.response?.data?.erro || error.message}`);
    }
}
