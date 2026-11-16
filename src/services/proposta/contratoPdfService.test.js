/** @jest-environment node */
import fs from 'fs';
import path from 'path';
import { criarContratoPdf } from './contratoPdfService';

const pasta = path.join(__dirname, '../../imagens/contrato');
const fundos = Object.fromEntries(Object.entries({ capa: 'pagina-1', itens: 'pagina-2',
    condicoes: 'pagina-3', assinaturas: 'pagina-4', continuacao: 'continuacao', beneficios: 'beneficios'
}).map(([nome, arquivo]) => [nome, new Uint8Array(fs.readFileSync(path.join(pasta, `${arquivo}.jpg`)))]));
const proposta = {
    numero: 1052, emissao: new Date(2026, 10, 5), validade: new Date(2026, 10, 10),
    cliente: { nome: 'Cliente de teste', cnpj: '00.000.000/0001-00', cidade: 'Canoas', uf: 'RS', contato: 'Maria' },
    enderecoEntrega: { logradouro: 'Rua de teste', numero: '123' },
    totalProdutos: 897.7,
    itens: Array.from({ length: 6 }, (_, i) => ({ codigo: 1000 + i, marca: 'MSO', descricao: 'Material hospitalar',
        unidadeMedida: 'UN', valorUnitario: 11.6, quantidade: 3, valorTotal: 34.8 }))
};

test('contrato de seis itens mantém quatro páginas e os dados variáveis', () => {
    const doc = criarContratoPdf(proposta, fundos);
    const pdf = doc.output();
    expect(doc.getNumberOfPages()).toBe(4);
    expect(pdf).toContain('Cliente de teste');
    expect(pdf).toContain('5.386,20');
    expect(pdf).not.toContain('Carla Marconi');
});

test('lista extensa cria páginas de continuação sem perder os últimos itens', () => {
    const itens = Array.from({ length: 90 }, (_, i) => ({ ...proposta.itens[0], codigo: 90000 + i,
        descricao: 'Material com uma descrição longa para verificar a quebra das linhas na tabela do contrato' }));
    const doc = criarContratoPdf({ ...proposta, itens }, fundos);
    expect(doc.getNumberOfPages()).toBeGreaterThan(4);
    expect(doc.output()).toContain('90089');
});
