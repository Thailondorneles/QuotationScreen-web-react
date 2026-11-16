import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { InformacoesCliente } from './InformacoesCliente';
import { buscarClienteDemanda, carregarInformacoesCliente } from '../../services/demandaContratos/clientes';

jest.mock('../../services/demandaContratos/clientes', () => ({ buscarClienteDemanda: jest.fn(), carregarInformacoesCliente: jest.fn() }));
jest.mock('../LovClientes', () => ({ LovClientes: () => null }));
jest.mock('./ContratosCliente', () => ({ ContratosCliente: () => null }));

test('seleciona o cliente ao digitar código e sair do campo, sem exigir clique em Consultar', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const cliente = { cod_pessoa: 9389, des_pessoa: 'UNIMED PORTO ALEGRE' };
    buscarClienteDemanda.mockResolvedValue(cliente);
    carregarInformacoesCliente.mockResolvedValue({ cliente, representantes: [], avisos: [] });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
        await act(async () => root.render(<InformacoesCliente />));
        const input = container.querySelector('#demanda-cliente-codigo');
        await act(async () => Simulate.change(input, { target: { value: '9389' } }));
        await act(async () => Simulate.blur(input));
        expect(buscarClienteDemanda).toHaveBeenCalledWith('9389');
        expect(container.querySelector('[aria-label="Nome do cliente"]').value).toBe('UNIMED PORTO ALEGRE');
        expect(container.textContent).toContain('Cadastro do cliente');
    } finally {
        await act(async () => root.unmount());
        container.remove();
        delete global.IS_REACT_ACT_ENVIRONMENT;
    }
});
