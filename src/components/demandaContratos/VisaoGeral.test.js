import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { VisaoGeral } from './VisaoGeral';
import { carregarVisaoGeral } from '../../services/demandaContratos/contratos';
import { baixarBlob } from '../../services/proposta/propostaDownloadService';

jest.mock('../../services/demandaContratos/contratos', () => ({ carregarVisaoGeral: jest.fn() }));
jest.mock('../../services/proposta/propostaDownloadService', () => ({ baixarBlob: jest.fn() }));
const item = { cod_cliente: 1, des_pessoa: 'Hospital teste', representante: 'Maria', cod_item: 10, num_pedido: 37, cod_unidade: 201, dta_emissao: '2026-05-01', dta_carga: '2099-12-30', qtd_negociada: 100, vlr_uni_bruto: 2, txt_livre1: '08/2026;150;' };
let container, root, abrir;
beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div'); document.body.appendChild(container);
    root = createRoot(container); abrir = jest.fn();
    carregarVisaoGeral.mockReset(); baixarBlob.mockReset();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); delete global.IS_REACT_ACT_ENVIRONMENT; });
const montar = async (ativa = true) => act(async () => root.render(<VisaoGeral ativa={ativa} onAbrirCliente={abrir} />));

test('não consulta antes de ativar a aba e abre cliente da tabela', async () => {
    carregarVisaoGeral.mockResolvedValue({ contratos: [item], reservas: [], erros: [] });
    await montar(false);
    expect(carregarVisaoGeral).not.toHaveBeenCalled();
    await montar();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    const botao = container.querySelector('.demanda-geral-cliente');
    await act(async () => botao.click());
    expect(abrir).toHaveBeenCalledWith({ cod_pessoa: '1', des_pessoa: 'Hospital teste' });
    await act(async () => Simulate.change(container.querySelector('input'), { target: { value: 'inexistente' } }));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(container.textContent).toContain('Nenhum cliente encontrado');
});

test('carrega carteira sem cliente selecionado, trata falha e permite tentar novamente', async () => {
    let resolver;
    carregarVisaoGeral.mockReturnValueOnce(new Promise(resolve => { resolver = resolve; }));
    await montar();
    expect(container.textContent).toContain('Carregando contratos');
    await act(async () => resolver({ contratos: null, reservas: [], erros: ['Resumo incompleto'] }));
    expect(container.querySelector('[role="alert"]').textContent).toBe('Resumo incompleto');
    carregarVisaoGeral.mockRejectedValueOnce(new Error('offline'));
    await act(async () => [...container.querySelectorAll('button')].find(botao => botao.textContent === 'Atualizar').click());
    expect(container.textContent).toContain('Não foi possível carregar');
});

test('exporta Excel real dos clientes filtrados', async () => {
    carregarVisaoGeral.mockResolvedValue({ contratos: [item], reservas: [], erros: [] });
    await montar();
    await act(async () => {
        [...container.querySelectorAll('button')].find(botao => botao.textContent === 'Exportar Excel').click();
        for (let i = 0; i < 200 && !baixarBlob.mock.calls.length; i++) await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(baixarBlob).toHaveBeenCalledWith(expect.any(Blob), 'Visao_geral_contratos.xlsx');
    expect(baixarBlob.mock.calls[0][0].size).toBeGreaterThan(1000);
});

test('exibe contratado parcial em vez de esconder todo o valor quando falta vigência', async () => {
    carregarVisaoGeral.mockResolvedValue({ contratos: [item, { ...item, num_pedido: 38, cod_item: 11, dta_carga: null }], reservas: [], erros: [] });
    await montar();
    const avisos = container.querySelectorAll('.demanda-valor-parcial');
    expect(avisos).toHaveLength(2);
    expect(avisos[0].textContent).toBe('Parcial · 1 item(ns) sem vigência válida');
    expect(avisos[0].parentElement.textContent).toContain('R$');
});
