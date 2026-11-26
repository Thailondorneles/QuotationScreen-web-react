import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DemandaContratos } from './DemandaContratos';
import { carregarContratosCliente, carregarVisaoGeral } from '../services/demandaContratos/contratos';

const mockConsulta = { codigo: '2484', consultar: jest.fn() };
jest.mock('../hooks/demandaContratos/useInformacoesCliente', () => ({ useInformacoesCliente: () => mockConsulta }));
jest.mock('../components/demandaContratos/InformacoesCliente', () => ({ InformacoesCliente: ({ consulta }) => <p>Informações: {consulta.codigo}</p> }));
jest.mock('../services/demandaContratos/contratos', () => ({ carregarContratosCliente: jest.fn(), carregarVisaoGeral: jest.fn() }));
jest.mock('../components/LovClientes', () => ({ LovClientes: () => null }));

test('alterna consultas mantendo o mesmo cliente e a aba anterior montada', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
        await act(async () => root.render(<DemandaContratos />));
        const partes = container.querySelectorAll('.demanda-conteudo-aba');
        expect(partes[0].hidden).toBe(false);
        expect(partes[1].hidden).toBe(true);
        await act(async () => [...container.querySelectorAll('button')].find(botao => botao.textContent === 'Consulta por cliente').click());
        expect(partes[0].hidden).toBe(true);
        expect(partes[1].hidden).toBe(false);
        expect(partes[1].querySelector('#consulta-cliente-codigo').value).toBe('2484');
        expect(carregarContratosCliente).not.toHaveBeenCalled();
    } finally {
        await act(async () => root.unmount());
        delete global.IS_REACT_ACT_ENVIRONMENT;
    }
});

test('abre a consulta por cliente ao selecionar uma linha da visão geral', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    carregarVisaoGeral.mockResolvedValue({ contratos: [{ cod_cliente: 10, des_pessoa: 'Hospital da visão geral', num_pedido: 37, cod_item: 1, qtd_negociada: 10 }], reservas: [], erros: [] });
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
        await act(async () => root.render(<DemandaContratos />));
        await act(async () => [...container.querySelectorAll('.demanda-subabas button')].find(botao => botao.textContent === 'Visão geral').click());
        expect(container.querySelector('.demanda-visao-geral').closest('[hidden]')).toBeNull();
        await act(async () => container.querySelector('.demanda-geral-cliente').click());
        expect(mockConsulta.consultar).toHaveBeenCalledWith({ cod_pessoa: '10', des_pessoa: 'Hospital da visão geral' });
        expect(container.querySelector('#consulta-cliente-codigo').closest('[hidden]')).toBeNull();
        expect(container.querySelector('.demanda-visao-geral').closest('[hidden]')).not.toBeNull();
    } finally {
        await act(async () => root.unmount());
        delete global.IS_REACT_ACT_ENVIRONMENT;
    }
});
