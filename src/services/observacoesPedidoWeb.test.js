import { unimedApi } from '../config/apis';
import { consultarObservacoesPedido } from './observacoesPedidoWeb';

jest.mock('../config/apis', () => ({ unimedApi: { get: jest.fn() } }));

test('carrega páginas, ordena sequências e restaura os indicadores sem a observação 99', async () => {
    unimedApi.get.mockResolvedValueOnce({ data: {
        items: [{ num_seq_obs: 2, txt_obs: 'Segunda', ind_pedido: 0, ind_nf: 1, ind_registro: 0, ind_cr: 1 }], hasMore: true
    } }).mockResolvedValueOnce({ data: {
        items: [{ num_seq_obs: 99, txt_obs: '753' }, { num_seq_obs: 1, txt_obs: 'Primeira', ind_pedido: '1', ind_nf: '0', ind_registro: '1', ind_cr: '0' }], hasMore: false
    } });
    await expect(consultarObservacoesPedido(753)).resolves.toEqual([
        { num_seq: 1, descricao: 'Primeira', pedido: true, nota: false, registro: true, financeiro: false },
        { num_seq: 2, descricao: 'Segunda', pedido: false, nota: true, registro: false, financeiro: true }
    ]);
    expect(unimedApi.get).toHaveBeenNthCalledWith(2, 'EsPeObservacoes/753', { params: { offset: 1, limit: 500 } });
});
