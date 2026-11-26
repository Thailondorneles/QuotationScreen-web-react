import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { ConsultaPorCliente } from './ConsultaPorCliente';
import { carregarContratosCliente } from '../../services/demandaContratos/contratos';
import { baixarBlob } from '../../services/proposta/propostaDownloadService';

jest.mock('../../services/demandaContratos/contratos', () => ({ carregarContratosCliente: jest.fn() }));
jest.mock('../LovClientes', () => ({ LovClientes: () => null }));
jest.mock('../../services/proposta/propostaDownloadService', () => ({ baixarBlob: jest.fn() }));

const selecao = cliente => ({ codigo: cliente ? String(cliente.cod_pessoa) : '', cliente, informacoes: null, consultar: jest.fn(), limpar: jest.fn(), setCodigo: jest.fn() });
const cliente = { cod_pessoa: 2484, des_pessoa: 'Hospital teste' };
const item = { cod_cliente: 2484, num_pedido: 14, cod_item: 10, des_item: 'Gaze estéril', qtd_negociada: 200, dta_emissao: '2026-05-01', dta_carga: '2026-12-30', vlr_uni_bruto: 2, txt_livre1: '08/2026;150;09/2026;150;10/2026;150;' };
let container, root;
beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 20));
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    carregarContratosCliente.mockReset();
    baixarBlob.mockReset();
});
afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
    jest.useRealTimers();
});
const montar = async (consulta, ativa = true) => act(async () => root.render(<ConsultaPorCliente consulta={consulta} ativa={ativa} />));

test('abre sem cliente e sem resultado, inclusive quando a aba está oculta', async () => {
    await montar(selecao(null), false);
    expect(container.textContent).toContain('Consulta por cliente');
    expect(carregarContratosCliente).not.toHaveBeenCalled();
    await montar(selecao(null));
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('input[placeholder="Todos os itens"]')).not.toBeNull();
    expect(container.querySelector('.demanda-consulta-vazia h3').textContent).toContain('Escolha um cliente');
    expect(container.querySelector('[role="status"]')).toBeNull();
});

test('aguarda a API, mostra itens, filtra e limpa o cliente sem erro', async () => {
    let resolver;
    carregarContratosCliente.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
    const consulta = selecao(cliente);
    await montar(consulta);
    expect(container.textContent).toContain('Carregando informações');
    await act(async () => resolver({ contratos: [], reservas: [item], erros: [] }));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.textContent).toContain('Gaze estéril');
    expect(container.textContent).toContain('Base: reserva');
    const filtro = container.querySelector('input[placeholder="Todos os itens"]');
    await act(async () => Simulate.change(filtro, { target: { value: 'inexistente' } }));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(container.textContent).toContain('Nenhum item encontrado');
    await montar(selecao(null));
    expect(container.querySelector('table')).toBeNull();
});

test('ignora resposta de cliente anterior depois de limpar a seleção', async () => {
    let resolver;
    carregarContratosCliente.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
    await montar(selecao(cliente));
    await montar(selecao(null));
    await act(async () => resolver({ contratos: [], reservas: [item], erros: [] }));
    expect(container.querySelector('table')).toBeNull();
    expect(container.textContent).not.toContain('Gaze estéril');
});

test('permite repetir consulta após falha e apresenta resultado vazio explicitamente', async () => {
    carregarContratosCliente.mockRejectedValueOnce(new Error('offline'));
    const consulta = selecao(cliente);
    await montar(consulta);
    expect(container.textContent).toContain('Não foi possível carregar');
    carregarContratosCliente.mockResolvedValue({ contratos: [], reservas: [], erros: [] });
    await act(async () => Simulate.submit(container.querySelector('form')));
    expect(carregarContratosCliente).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Nenhum item encontrado');
});

test('exibe vínculo, sugestão, projeção, meses coloridos e filtra pela classificação', async () => {
    carregarContratosCliente.mockResolvedValue({
        contratos: [{ ...item, num_pedido: 37, qtd_negociada: 100 }],
        reservas: [{ ...item, num_pedido_vinculado: 37, cod_unidade: 201 }], erros: []
    });
    await montar(selecao(cliente));
    const linha = container.querySelector('tbody tr');
    expect(linha.textContent).toContain('37: 37');
    expect(linha.querySelector('.demanda-unidade').textContent).toBe('201');
    expect(container.querySelector('option[value="201"], option:not([value])').textContent).toBe('201');
    expect(container.querySelector('.demanda-consulta-chips button').textContent).toBe('Todos 1');
    expect(linha.textContent).toContain('Vence em 40 dias');
    expect(linha.querySelector('.demanda-reserva-sugerida').textContent).toContain('150');
    expect(linha.querySelector('.demanda-reserva-sugerida').textContent).toContain('Dif.: -50');
    expect(linha.lastElementChild.textContent).toContain('1.050');
    expect(linha.lastElementChild.textContent).toContain('de 700 (150%)');
    expect(linha.querySelectorAll('.demanda-mes-acima')).toHaveLength(3);
    expect(container.querySelectorAll('thead th')).toHaveLength(16);
    const abaixo = [...container.querySelectorAll('.demanda-consulta-chips button')].find(botao => botao.textContent.startsWith('Abaixo'));
    await act(async () => abaixo.click());
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
    const ajustar = [...container.querySelectorAll('.demanda-consulta-chips button')].find(botao => botao.textContent.startsWith('Reserva a ajustar'));
    await act(async () => ajustar.click());
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
});

test('distingue consumo após vencimento e mantém a abertura com dados parciais', async () => {
    carregarContratosCliente.mockResolvedValue({ contratos: null, reservas: [{ ...item, dta_carga: '2026-09-30' }], erros: ['Falha na situação 37'] });
    await montar(selecao(cliente));
    expect(container.querySelector('[role="alert"]').textContent).toBe('Falha na situação 37');
    expect(container.querySelector('[title="Consumo com contrato vencido"]').textContent).toBe('150');
    expect(container.querySelector('.demanda-vigencia-vencida').textContent).toBe('Vencido há 51 dias');
});

test('gera arquivo Excel real com o cliente e itens da consulta', async () => {
    jest.useRealTimers();
    carregarContratosCliente.mockResolvedValue({ contratos: [], reservas: [item], erros: [] });
    await montar(selecao(cliente));
    await act(async () => {
        [...container.querySelectorAll('button')].find(botao => botao.textContent === 'Exportar Excel').click();
        // A escrita do XLSX utiliza tarefas assíncronas da biblioteca.
        for (let tentativa = 0; tentativa < 100 && !baixarBlob.mock.calls.length; tentativa++) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    });
    expect(baixarBlob).toHaveBeenCalledWith(expect.any(Blob), 'Consulta_cliente_2484.xlsx');
    expect(baixarBlob.mock.calls[0][0].size).toBeGreaterThan(1000);
    expect(container.querySelector('[role="alert"]')).toBeNull();
});
