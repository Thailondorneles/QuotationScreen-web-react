import { unimedApi } from '../../config/apis';
import { consultarComCache } from '../consultaCache';

export function getClientesDaCarteira() {
    return consultarComCache('demanda|carteira', async () => {
        const clientes = [];
        let mais;
        do {
            const { data } = await unimedApi.get('carteira/clientes', { params: { offset: clientes.length, limit: 500 } });
            if (!Array.isArray(data?.items) || (data.hasMore === true && !data.items.length)) {
                throw new Error('Resposta inválida na consulta da carteira.');
            }
            clientes.push(...data.items);
            mais = data.hasMore === true;
        } while (mais);
        return clientes;
    });
}

export function getClienteDaCarteira(codigo) {
    return unimedApi.get(`carteira/clientes/${encodeURIComponent(codigo)}`);
}

export function getDetalhesDaCarteira(codigo) {
    return unimedApi.get(`carteira/ClienteDetalhado/${encodeURIComponent(codigo)}`);
}

export function getRepresentantesDaCarteira(codigo) {
    return unimedApi.get(`carteira/representantesCliente/${encodeURIComponent(codigo)}`, { params: { offset: 0, limit: 25 } });
}
