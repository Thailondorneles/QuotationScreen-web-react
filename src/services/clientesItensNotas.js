import { unimedApi } from '../config/apis';
import { consultarComCache } from './consultaCache';

export function getClientesItensNotas(codCliente) {
    return consultarComCache(`clientesItensNotas|${codCliente}`, async () => {
        const response = await unimedApi.get(`clientesItensNotas/${encodeURIComponent(codCliente)}`);
        if (!Array.isArray(response.data?.items)) throw new Error('Resposta de notas inválida.');
        return Object.fromEntries(response.data.items.map(item => [String(item.cod_item), item]));
    });
}
