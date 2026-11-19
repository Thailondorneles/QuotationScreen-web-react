import { unimedApi } from '../../config/apis';
import { consultarComCache } from '../consultaCache';

export function consultarVendasCliente(codigo, periodo) {
    return consultarComCache(`notasSaida|${codigo}|${periodo.inicio}|${periodo.fim}`, async () => {
        const itens = [];
        let mais;
        do {
            const { data } = await unimedApi.get('notasSaida', { params: {
                cod_cliente: String(codigo), data_inicio: periodo.inicio, data_fim: periodo.fim,
                offset: itens.length, limit: 2000
            } });
            if (!Array.isArray(data?.items) || (data.hasMore && !data.items.length)) throw new Error('Resposta inválida na consulta de vendas.');
            itens.push(...data.items);
            mais = data.hasMore === true;
        } while (mais);
        return itens.filter(item => String(item.cod_cliente) === String(codigo));
    });
}
