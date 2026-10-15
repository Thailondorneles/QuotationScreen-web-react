import { unimedApi } from '../config/apis';
import { getLotesDisponiveis } from './itens';

jest.mock('../config/apis', () => ({ unimedApi: { get: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

test('consulta todos os lotes do item, incluindo paginas seguintes', async () => {
    unimedApi.get.mockResolvedValueOnce({ data: { items: [{ num_lote: 'A', qtd_disponivel: 8 }], hasMore: true } })
        .mockResolvedValueOnce({ data: { items: [{ num_lote: 'B', qtd_disponivel: 1195 }], hasMore: false } });
    await expect(getLotesDisponiveis(12962)).resolves.toEqual([
        { num_lote: 'A', qtd_disponivel: 8 }, { num_lote: 'B', qtd_disponivel: 1195 }
    ]);
    expect(unimedApi.get).toHaveBeenNthCalledWith(2, 'itensLotesDisponiveis/12962', { params: { offset: 1, limit: 500 } });
});

test('permite retorno sem lotes e rejeita paginacao inconsistente', async () => {
    unimedApi.get.mockResolvedValueOnce({ data: { items: [], hasMore: false } });
    await expect(getLotesDisponiveis(12962)).resolves.toEqual([]);
    unimedApi.get.mockResolvedValueOnce({ data: { items: [], hasMore: true } });
    await expect(getLotesDisponiveis(12962)).rejects.toThrow();
});

test('propaga falha de consulta para permitir nova tentativa', async () => {
    unimedApi.get.mockRejectedValueOnce(new Error('Falha de rede'));
    await expect(getLotesDisponiveis(12962)).rejects.toThrow('Falha de rede');
});
