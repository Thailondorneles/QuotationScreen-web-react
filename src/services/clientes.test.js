import { unimedApi } from '../config/apis';
import { obterClienteParaProposta } from './clientes';
import { criarPropostasPorUnidade } from './proposta/propostaDataService';

jest.mock('../config/apis', () => ({ unimedApi: { get: jest.fn() } }));

test('exporta cidade da listagem mesmo quando consulta por código retorna cidade vazia', async () => {
    unimedApi.get.mockImplementation(url => Promise.resolve({ data: { items: url === 'clientes'
        ? [{ cod_pessoa: 22221, des_cidade: 'OUTRA CIDADE' }, { cod_pessoa: 22222, des_cidade: 'NOVO HAMBURGO' }]
        : [{ cod_pessoa: 22222, des_cidade: null, email: 'contato@example.com' }]
    } }));
    const cliente = await obterClienteParaProposta({ cod_pessoa: '22222', des_pessoa: 'Cliente' });
    expect(cliente.des_cidade).toBe('NOVO HAMBURGO');
    expect(cliente.email).toBe('contato@example.com');
    const propostas = criarPropostasPorUnidade({ cliente, itensPedido: [
        { seq: 1, unidade: 201, selecionado: true, quantidade: 1, valorLista: 10 },
        { seq: 2, unidade: 203, selecionado: true, quantidade: 1, valorLista: 10 }
    ] });
    expect(propostas.map(proposta => proposta.cliente.cidade)).toEqual(['NOVO HAMBURGO', 'NOVO HAMBURGO']);
});
