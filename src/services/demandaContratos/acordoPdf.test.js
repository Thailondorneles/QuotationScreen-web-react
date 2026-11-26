/** @jest-environment node */
import { criarPdfAcordo } from './acordoPdf';
const dados = {
    cliente: { cod_pessoa: 2484, des_pessoa: 'CLIENTE DE TESTE', cnpj: '92685833000151', des_cidade: 'PORTO ALEGRE', cod_uf: 'RS' },
    consultor: { nome: 'CONSULTOR DE TESTE', email: 'consultor@exemplo.com', representante: 'REPRESENTANTE DE TESTE' },
    itens: [{ codigo: '15438', marca: 'HEALTH QUALITY', descricao: 'Avental', quantidade: 6667, preco: 15.97 },
        { codigo: '13223', marca: 'ESTERILI-MED', descricao: 'Capa', quantidade: 1286, preco: 2.65 }],
    emissao: new Date(2026, 10, 17)
};
test('PDF inclui cliente, consultor, itens escolhidos e total calculado', () => {
    const pdf = criarPdfAcordo(dados);
    const conteudo = pdf.output();
    expect(conteudo).toContain('CLIENTE DE TESTE');
    expect(conteudo).toContain('CONSULTOR DE TESTE');
    expect(conteudo).toContain('15438');
    expect(conteudo).toContain('109.879,89');
    expect(pdf.getNumberOfPages()).toBe(1);
});
test('opção sem preços não inclui valores unitários nem total mensal', () => {
    const conteudo = criarPdfAcordo({ ...dados, mostrarPrecos: false }).output();
    expect(conteudo).toContain('15438');
    expect(conteudo).not.toContain('109.879,89');
    expect(conteudo).not.toContain('15,97');
});
test('lista extensa gera múltiplas páginas e preserva o último item', () => {
    const pdf = criarPdfAcordo({ ...dados, itens: Array.from({ length: 90 }, (_, i) => ({ ...dados.itens[0], codigo: `ITEM-${i}`, descricao: 'Descrição longa '.repeat(8) })) });
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    expect(pdf.output()).toContain('ITEM-89');
});
