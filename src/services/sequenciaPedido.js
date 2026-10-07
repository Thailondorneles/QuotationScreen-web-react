import { unimedApi } from '../config/apis';

// Cada chamada reserva um número novo; não usar cache nem repetição automática.
export async function reservarSequenciaPedido() {
    try {
        const { data } = await unimedApi.get('EsPeSequencia');
        const sequencia = Number(data?.numSeqPedido);
        if (data?.success === false || data?.erro || !Number.isSafeInteger(sequencia) || sequencia <= 0) {
            throw new Error(data?.erro || 'A API não retornou um sequencial válido.');
        }
        return sequencia;
    } catch (error) {
        throw new Error(`Não foi possível reservar o sequencial: ${error.response?.data?.erro || error.message}`);
    }
}
