import { consultarVendasCliente } from './vendas';
import { unimedApi } from '../../config/apis';
import { invalidarConsultas } from '../consultaCache';
jest.mock('../../config/apis', () => ({ unimedApi: { get: jest.fn() } }));
const periodo = { inicio: '2026-06-01', fim: '2026-11-17' };
beforeEach(() => { jest.resetAllMocks(); invalidarConsultas('notasSaida|'); });
test('envia filtros e consome todas as páginas sem misturar clientes', async () => {
    unimedApi.get.mockResolvedValueOnce({ data: { items: [{ cod_cliente: 9389, cod_item: 1 }], hasMore: true } })
        .mockResolvedValueOnce({ data: { items: [{ cod_cliente: 9389, cod_item: 2 }, { cod_cliente: 99, cod_item: 3 }], hasMore: false } });
    const itens = await consultarVendasCliente(9389, periodo);
    expect(itens.map(item => item.cod_item)).toEqual([1, 2]);
    expect(unimedApi.get).toHaveBeenNthCalledWith(2, 'notasSaida', { params: { cod_cliente: '9389', data_inicio: periodo.inicio, data_fim: periodo.fim, offset: 1, limit: 2000 } });
});
test('falhas não ficam em cache e paginação sem progresso é recusada', async () => {
    unimedApi.get.mockResolvedValueOnce({ data: { items: [], hasMore: true } }).mockResolvedValueOnce({ data: { items: [], hasMore: false } });
    await expect(consultarVendasCliente(9389, periodo)).rejects.toThrow('Resposta inválida');
    await expect(consultarVendasCliente(9389, periodo)).resolves.toEqual([]);
});
