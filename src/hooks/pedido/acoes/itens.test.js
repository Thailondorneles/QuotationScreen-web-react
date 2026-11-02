import { criarAcoesItens } from './itens';
import { getItens, getItensDetalhados } from '../../../services/itens';

jest.mock('../../../services/itens', () => ({ getItens: jest.fn(), getItensDetalhados: jest.fn() }));

function preparar(semTributacao = false) {
    getItens.mockResolvedValue({ data: { items: [{ cod_item: 7084, qtd_multiplo: 5 }] } });
    getItensDetalhados.mockResolvedValue({ data: { items: [{ cod_item: 7084 }] } });
    const buscarDadosItem = jest.fn(async item => ({
        valorLista: item.unidade === 201 ? 8.1615 : 9.25,
        precoListaBloqueado: true,
        semTributacao: semTributacao && item.unidade === 203
    }));
    const setItensPedido = jest.fn();
    const acoes = criarAcoesItens({
        nextId: { current: 1 }, nextNumItem: { current: 1 },
        cliente: { cod_pessoa: 1 }, operacao: { cod_oper: 1 }, CondPgto: { cod_cond_pgto: 1 },
        itensPedido: [], buscarDadosItem, setItensPedido, setFreteSelecionado: jest.fn()
    });
    return { ...acoes, buscarDadosItem, setItensPedido };
}

test('importa a quantidade nas duas unidades com os respectivos preços das APIs', async () => {
    const { importarItensExcel, buscarDadosItem, setItensPedido } = preparar();
    await importarItensExcel([{ codigo: 7084, quantidade: 50, linha: 2 }]);
    expect(buscarDadosItem).toHaveBeenCalledTimes(2);
    const itens = setItensPedido.mock.calls[0][0]([]);
    expect(itens).toEqual([
        expect.objectContaining({ unidade: 201, quantidade: 50, valorLista: 8.1615, selecionado: true }),
        expect.objectContaining({ unidade: 203, quantidade: 50, valorLista: 9.25, selecionado: true })
    ]);
});

test('não altera o pedido se uma das unidades estiver sem tributação', async () => {
    const { importarItensExcel, setItensPedido } = preparar(true);
    await expect(importarItensExcel([{ codigo: 7084, quantidade: 50, linha: 2 }])).rejects.toThrow('unidade 203');
    expect(setItensPedido).not.toHaveBeenCalled();
});

test('rejeita quantidade fora do múltiplo antes de consultar preços', async () => {
    const { importarItensExcel, buscarDadosItem, setItensPedido } = preparar();
    await expect(importarItensExcel([{ codigo: 7084, quantidade: 51, linha: 2 }])).rejects.toThrow('múltipla de 5');
    expect(buscarDadosItem).not.toHaveBeenCalled();
    expect(setItensPedido).not.toHaveBeenCalled();
});
