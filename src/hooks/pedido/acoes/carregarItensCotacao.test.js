import { carregarItensCotacao } from './carregarItensCotacao';
import { consultarItensPedido } from '../../../services/itensPedidoWeb';
import { getItens, getItensDetalhados } from '../../../services/itens';

jest.mock('../../../services/itensPedidoWeb', () => ({ consultarItensPedido: jest.fn() }));
jest.mock('../../../services/itens', () => ({ getItens: jest.fn(), getItensDetalhados: jest.fn() }));

test('consulta três lotes em paralelo e preserva os valores salvos', async () => {
    const registros = Array.from({ length: 41 }, (_, i) => ({
        numSeqPedido: 753, numItem: i + 1, codItem: i + 1, codUnidade: 201,
        qtdNegociada: 5, vlrUnitario: 12, indSelecionado: 1
    }));
    consultarItensPedido.mockResolvedValue(registros);
    getItens.mockResolvedValue({ data: { items: registros.map(r => ({ cod_item: r.codItem, des_item: `Produto ${r.codItem}` })), hasMore: false } });
    const concluir = [];
    let liberarLotes;
    const lotesIniciados = new Promise(resolve => { liberarLotes = resolve; });
    getItensDetalhados.mockImplementation(({ codItens }) => new Promise(resolve => {
        concluir.push(() => resolve({ data: { items: codItens.map(codigo => ({ cod_item: codigo })) } }));
        if (concluir.length === 3) liberarLotes();
    }));
    const carga = carregarItensCotacao({ numSeqPedido: 753 }, async () => ({ valorLista: 999 }));
    await lotesIniciados;
    expect(getItensDetalhados).toHaveBeenCalledTimes(3);
    concluir.forEach(resolve => resolve());
    const itens = await carga;
    expect(itens).toHaveLength(82);
    expect(itens[0]).toEqual(expect.objectContaining({ numItem: 1, quantidade: 5, valorLista: 12, selecionado: true }));
    expect(itens[1].selecionado).toBe(false);
});
