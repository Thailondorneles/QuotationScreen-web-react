import { consultarDemandaSituacao, carregarContratosCliente } from './contratos';
import { unimedApi } from '../../config/apis';
import { invalidarConsultas } from '../consultaCache';
jest.mock('../../config/apis', () => ({ unimedApi: { get: jest.fn() } }));
beforeEach(() => { invalidarConsultas('demandaContratos|'); jest.resetAllMocks(); });

test('carrega todas as páginas antes de filtrar pelo cliente', async () => {
    unimedApi.get.mockImplementation((url, { params }) => Promise.resolve({ data: {
        items: params.situacao === 14 ? [] : params.offset === 0 ? [{ cod_cliente: 1, num_pedido: 10 }] : [{ cod_cliente: 2 }, { cod_cliente: 1, num_pedido: 20 }],
        hasMore: params.situacao === 37 && params.offset === 0
    } }));
    const resultado = await carregarContratosCliente(1);
    expect(resultado.contratos.map(item => item.num_pedido)).toEqual([10, 20]);
    expect(resultado.reservas).toEqual([]);
    expect(resultado.erros).toEqual([]);
});

test('falha de reservas não apaga contratos nem é apresentada como ausência de reservas', async () => {
    unimedApi.get.mockImplementation((url, { params }) => params.situacao === 14 ? Promise.reject(new Error('Falha')) : Promise.resolve({ data: { items: [{ cod_cliente: 1 }], hasMore: false } }));
    const resultado = await carregarContratosCliente(1);
    expect(resultado.contratos).toHaveLength(1);
    expect(resultado.reservas).toBeNull();
    expect(resultado.erros).toHaveLength(1);
});

test('recusa paginação sem progresso e permite nova consulta após falha', async () => {
    unimedApi.get.mockResolvedValueOnce({ data: { items: [], hasMore: true } }).mockResolvedValueOnce({ data: { items: [], hasMore: false } });
    await expect(consultarDemandaSituacao(37, 4)).rejects.toThrow('Resposta inválida');
    await expect(consultarDemandaSituacao(37, 4)).resolves.toEqual([]);
});

test('envia filtro do cliente em todas as páginas e isola seu cache', async () => {
    unimedApi.get.mockResolvedValue({ data: { items: [], hasMore: false } });
    await consultarDemandaSituacao(37, 4);
    await consultarDemandaSituacao(37, 9389);
    await consultarDemandaSituacao(37, 4);
    expect(unimedApi.get).toHaveBeenCalledTimes(2);
    expect(unimedApi.get).toHaveBeenNthCalledWith(1, 'demandaContratos', { params: { cod_cliente: '4', situacao: 37, offset: 0, limit: 2000 } });
    expect(unimedApi.get).toHaveBeenNthCalledWith(2, 'demandaContratos', { params: { cod_cliente: '9389', situacao: 37, offset: 0, limit: 2000 } });
});
