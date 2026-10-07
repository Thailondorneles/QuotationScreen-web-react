import { unimedApi } from '../config/apis';
import { consultarEnderecoPedido } from './enderecoPedidoWeb';

jest.mock('../config/apis', () => ({ unimedApi: { get: jest.fn() } }));

test('recupera os campos e o código do tipo de logradouro do pedido', async () => {
    unimedApi.get.mockResolvedValueOnce({ data: { items: [{
        num_seq_pedido: 755, cod_vers_cotacao: 1, num_cep: '93540090',
        cod_tip_logradouro: 208, des_logradouro: 'VIDAL BRASIL'
    }] } });
    await expect(consultarEnderecoPedido({ numSeqPedido: 755, codVersCotacao: 1 })).resolves.toEqual({
        numSeqPedido: 755, codVersCotacao: 1, numCep: '93540090', codTipLogradouro: 208, desLogradouro: 'VIDAL BRASIL'
    });
});

test('ausência de endereço não impede o carregamento', async () => {
    unimedApi.get.mockResolvedValueOnce({ data: { items: [] } });
    await expect(consultarEnderecoPedido({ numSeqPedido: 755 })).resolves.toBeNull();
    unimedApi.get.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(consultarEnderecoPedido({ numSeqPedido: 755 })).resolves.toBeNull();
});

test('falhas de conexão não são tratadas como endereço ausente', async () => {
    unimedApi.get.mockRejectedValueOnce(new Error('Falha de conexão'));
    await expect(consultarEnderecoPedido({ numSeqPedido: 755 })).rejects.toThrow('Não foi possível consultar');
});
