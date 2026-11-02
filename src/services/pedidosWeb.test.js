import { extrairRegistros, excluirPedido } from './pedidosWeb';
import { unimedApi } from '../config/apis';

jest.mock('../config/apis', () => ({ unimedApi: { delete: jest.fn() } }));

test('exclusão usa DELETE no handler do pedido', async () => {
    unimedApi.delete.mockResolvedValue({ status: 200, data: { success: true } });
    await excluirPedido(753);
    expect(unimedApi.delete).toHaveBeenCalledWith('EsPePedidos/753', { data: {} });
});

test('exclusão informa recusa retornada pelo handler', async () => {
    unimedApi.delete.mockResolvedValue({ status: 200, data: { success: false, erro: 'Pedido integrado' } });
    await expect(excluirPedido(753)).rejects.toThrow('Pedido integrado');
});

test.each([
    { status: 200, data: {} },
    { status: 200, data: { success: 'true' } },
    { status: 204, data: { success: true } }
])('exclusão rejeita resposta sem confirmação explícita: %j', async resposta => {
    unimedApi.delete.mockResolvedValue(resposta);
    await expect(excluirPedido(753)).rejects.toThrow('A API não confirmou a exclusão do pedido.');
});

test('consulta preserva o consultor do pedido e normaliza o nome do campo', () => {
    expect(extrairRegistros({ items: [
        { num_seq_pedido: 753, des_consultor: 'MARILIA KRENZ DE PINHO' },
        { num_seq_pedido: 754, des_consultor: null }
    ] })).toEqual([
        { numSeqPedido: 753, desConsultor: 'MARILIA KRENZ DE PINHO' },
        { numSeqPedido: 754, desConsultor: null }
    ]);
});
