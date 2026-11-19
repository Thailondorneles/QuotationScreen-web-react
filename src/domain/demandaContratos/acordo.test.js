import { itemParaAcordo, numeroAcordo, validarItensAcordo } from './acordo';
test('novo item usa média arredondada para cima e último preço', () => {
    expect(itemParaAcordo({ codigo: '13223', descricao: 'Capa', marca: 'Marca', media: 1285.7, ultimoPreco: 2.65 }, 'novo'))
        .toEqual({ codigo: '13223', descricao: 'Capa', marca: 'Marca', origem: 'Novo item', quantidade: 1286, preco: 2.65 });
});
test('ampliação prefere último preço vendido ao preço de contrato', () => {
    expect(itemParaAcordo({ cod_item: 1, media: 12.2, quantidade: 10, vlr_uni_bruto: 99, venda: { ultimaQuantidade: 2, ultimoValor: 20 } }, 'ampliar'))
        .toEqual(expect.objectContaining({ quantidade: 13, preco: 10, origem: 'Ampliar contrato' }));
    expect(itemParaAcordo({ cod_item: 1, media: 12, quantidade: 10, vlr_uni_bruto: 99 }, 'ampliar').preco).toBe(99);
});
test('aceita vírgulas e recusa quantidades ou preços inválidos', () => {
    expect(numeroAcordo('1.234,56')).toBe(1234.56);
    expect(validarItensAcordo([{ descricao: 'Item', quantidade: '2', preco: '15,97' }])).toBe(true);
    expect(validarItensAcordo([{ descricao: 'Item', quantidade: 0, preco: 1 }])).toBe(false);
    expect(validarItensAcordo([{ descricao: 'Item', quantidade: 1, preco: -1 }])).toBe(false);
});
