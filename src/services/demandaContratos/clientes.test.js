import { buscarClienteDemanda, carregarInformacoesCliente } from './clientes';
import { getClienteByFilter, getClienteDetalhado } from '../clientes';
import { getRepresentantesByCliente } from '../representantes';

jest.mock('../clientes', () => ({ getClienteByFilter: jest.fn(), getClienteDetalhado: jest.fn() }));
jest.mock('../representantes', () => ({ getRepresentantesByCliente: jest.fn() }));
const resposta = items => Promise.resolve({ data: { items } });
beforeEach(() => jest.resetAllMocks());

test('busca pelo código exato sem selecionar outro cliente retornado pelo filtro', async () => {
    getClienteByFilter.mockImplementation(() => resposta([{ cod_pessoa: 123, des_pessoa: 'Outro' }, { cod_pessoa: 12, des_pessoa: 'Cliente' }]));
    expect(await buscarClienteDemanda('12')).toEqual({ cod_pessoa: 12, des_pessoa: 'Cliente' });
    expect(await buscarClienteDemanda('99')).toBeNull();
});

test('combina cadastro, contatos e detalhes sem apagar valores preenchidos', async () => {
    getClienteByFilter.mockImplementation(() => resposta([{ cod_pessoa: 12, des_contato: 'Contato', des_email: 'contato@exemplo.com' }]));
    getClienteDetalhado.mockImplementation(() => resposta([{ cod_pessoa: 12, des_contato: '', des_email: null, des_consultor: 'Consultor' }]));
    getRepresentantesByCliente.mockImplementation(() => resposta([{ cod_pessoa_rep: 3, des_pessoa: 'Representante' }]));
    const dados = await carregarInformacoesCliente({ cod_pessoa: 12, des_pessoa: 'Cliente', des_cidade: 'Cidade' });
    expect(dados.cliente).toEqual(expect.objectContaining({ des_pessoa: 'Cliente', des_contato: 'Contato', des_email: 'contato@exemplo.com', des_cidade: 'Cidade', des_consultor: 'Consultor' }));
    expect(dados.representantes).toHaveLength(1);
    expect(dados.avisos).toEqual([]);
});

test('preserva o cadastro e informa falhas parciais para permitir nova tentativa', async () => {
    getClienteByFilter.mockImplementation(() => resposta([{ cod_pessoa: 12, des_email: 'contato@exemplo.com' }]));
    getClienteDetalhado.mockRejectedValue(new Error('Tempo excedido'));
    getRepresentantesByCliente.mockRejectedValue(new Error('Falha de conexão'));
    const dados = await carregarInformacoesCliente({ cod_pessoa: 12, des_pessoa: 'Cliente' });
    expect(dados.cliente.des_pessoa).toBe('Cliente');
    expect(dados.cliente.des_email).toBe('contato@exemplo.com');
    expect(dados.avisos).toHaveLength(2);
});

test('resposta inválida não é apresentada como consulta bem-sucedida', async () => {
    getClienteByFilter.mockResolvedValue({ data: '<html>Falha</html>' });
    await expect(buscarClienteDemanda('12')).rejects.toThrow('Resposta inválida');
});

test('não repete busca do cadastro que acabou de ser consultado pelo código', async () => {
    getClienteDetalhado.mockImplementation(() => resposta([]));
    getRepresentantesByCliente.mockImplementation(() => resposta([]));
    const dados = await carregarInformacoesCliente({ cod_pessoa: 9389, des_pessoa: 'Cliente' }, { cadastroJaConsultado: true });
    expect(getClienteByFilter).not.toHaveBeenCalled();
    expect(dados.cliente.des_pessoa).toBe('Cliente');
});
