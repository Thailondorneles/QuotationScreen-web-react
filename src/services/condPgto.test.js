import { unimedApi } from '../config/apis';
import { invalidarConsultas } from './consultaCache';
import { getAllCondPgtoCached, filtrarCondicoesPagamento } from './condPgto';

jest.mock('../config/apis', () => ({ unimedApi: { get: jest.fn() } }));

beforeEach(() => {
    jest.resetAllMocks();
    invalidarConsultas('');
});

test('pesquisa por código, descrição parcial, acentos e termos separados por espaço ou %', () => {
    const condicoes = [
        { cod_cond_pgto: 123, des_cond_pgto: 'À VISTA' },
        { cod_cond_pgto: 45, des_cond_pgto: 'BOLETO 30/60 DIAS' }
    ];
    for (const termo of ['23', 'vista', 'a vista']) {
        expect(filtrarCondicoesPagamento(condicoes, termo)).toEqual([condicoes[0]]);
    }
    for (const termo of ['boleto dias', 'boleto%60', '30/60']) {
        expect(filtrarCondicoesPagamento(condicoes, termo)).toEqual([condicoes[1]]);
    }
    expect(filtrarCondicoesPagamento(condicoes, ' ')).toEqual(condicoes);
    expect(filtrarCondicoesPagamento(condicoes, '[inexistente]')).toEqual([]);
});

test('carrega todas as páginas e compartilha o cache entre pesquisas', async () => {
    unimedApi.get.mockResolvedValueOnce({ data: { items: [{ cod_cond_pgto: 1 }], hasMore: true } })
        .mockResolvedValueOnce({ data: { items: [{ cod_cond_pgto: 2 }], hasMore: false } });
    await expect(getAllCondPgtoCached()).resolves.toEqual([{ cod_cond_pgto: 1 }, { cod_cond_pgto: 2 }]);
    await getAllCondPgtoCached();
    expect(unimedApi.get).toHaveBeenCalledTimes(2);
    expect(unimedApi.get).toHaveBeenNthCalledWith(2, 'condPgto', { params: { offset: 1, limit: 500 } });
});

test('permite tentar novamente após falha e rejeita página vazia com continuação', async () => {
    unimedApi.get.mockRejectedValueOnce(new Error('Falha de rede'))
        .mockResolvedValueOnce({ data: { items: [], hasMore: true } });
    await expect(getAllCondPgtoCached()).rejects.toThrow('Falha de rede');
    await expect(getAllCondPgtoCached()).rejects.toThrow('Paginação');
});
