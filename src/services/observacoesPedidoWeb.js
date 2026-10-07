import { unimedApi } from '../config/apis';
import { normalizarPedido } from './pedidosWeb';

export async function consultarObservacoesPedido(numSeqPedido) {
    const registros = [];
    let offset = 0;
    while (true) {
        const { data } = await unimedApi.get(`EsPeObservacoes/${encodeURIComponent(numSeqPedido)}`, {
            params: { offset, limit: 500 }
        });
        const pagina = Array.isArray(data) ? data : data?.items;
        if (!Array.isArray(pagina)) throw new Error('A consulta das observações retornou um formato inválido.');
        registros.push(...pagina.map(normalizarPedido));
        if (!data.hasMore) break;
        if (!pagina.length) throw new Error('A consulta das observações retornou uma paginação inválida.');
        offset += pagina.length;
    }
    return registros
        .filter(obs => Number(obs.numSeqObs) !== 99)
        .sort((a, b) => Number(a.numSeqObs) - Number(b.numSeqObs))
        .map(obs => ({
            num_seq: Number(obs.numSeqObs),
            descricao: obs.txtObs || '',
            pedido: Number(obs.indPedido) === 1,
            nota: Number(obs.indNf) === 1,
            registro: Number(obs.indRegistro) === 1,
            financeiro: Number(obs.indCr) === 1
        }));
}

export async function salvarObservacoesPedido(payload) {
    try {
        const { data } = await unimedApi.post('EsPeObservacoes', payload);
        if (data?.sucesso === false || data?.erro) throw new Error(data.erro || 'Gravação recusada.');
        if (typeof data === 'string' && /<!doctype|<html/i.test(data)) throw new Error('A API retornou uma página HTML.');
        return data;
    } catch (error) {
        throw new Error(`O cabeçalho e os itens foram salvos, mas não foi possível salvar as observações. A cotação permanece aberta para tentar novamente. ${error.response?.data?.erro || error.message}`);
    }
}
