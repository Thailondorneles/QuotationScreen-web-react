import { unimedApi } from '../config/apis';
import { normalizarPedido } from './pedidosWeb';

export async function consultarItensPedido(numSeqPedido) {
    const itens = [];
    let offset = 0;
    while (true) {
        const { data } = await unimedApi.get(`EsPeItens/${encodeURIComponent(numSeqPedido)}`, {
            params: { offset, limit: 500 }
        });
        const pagina = Array.isArray(data) ? data : data?.items ?? data?.itens;
        if (!Array.isArray(pagina)) throw new Error('A consulta dos itens retornou um formato inválido.');
        itens.push(...pagina.map(normalizarPedido));
        if (!data.hasMore) return itens;
        if (!pagina.length) throw new Error('A consulta dos itens retornou uma paginação inválida.');
        offset += pagina.length;
    }
}

export async function salvarItensPedido(payload) {
    try {

        const { data } = await unimedApi.post('EsPeItensIns', payload);
        if (data?.sucesso === false || data?.erro) throw new Error(data.erro || 'Gravação recusada.');
        if (typeof data === 'string' && /<!doctype|<html/i.test(data)) throw new Error('A API retornou uma página HTML.');
        return data;
    } catch (error) {

        throw new Error(`O cabeçalho foi salvo, mas não foi possível salvar os itens. A cotação permanece aberta para tentar novamente. ${error.response?.data?.erro || error.message}`);
    }
}
