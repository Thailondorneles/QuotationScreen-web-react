import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { LovItens } from './LovItens';
import { getItens, getItensDetalhados, getItensLotesCached } from '../services/itens';

jest.mock('../services/itens', () => ({
    getItens: jest.fn(),
    getItensDetalhados: jest.fn(),
    getItensLotesCached: jest.fn(),
    getItensAcordos: jest.fn()
}));
jest.mock('../services/impostos.js', () => ({ getImpostosCached: jest.fn() }));

test('sugere múltiplos, preserva quantidades editadas e impede inclusão de quantidade inválida', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    getItens.mockResolvedValue({ data: { items: [
        { cod_item: 1, des_item: 'POLIMAX A', cod_um: 'CX' },
        { cod_item: 2, des_item: 'POLIMAX B', cod_um: 'UN', qtd_multiplo: 5 }
    ] } });
    getItensDetalhados.mockResolvedValue({ data: { items: [{ cod_item: 1, qtd_multiplo: 12 }] } });
    getItensLotesCached.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSelect = jest.fn();
    try {
        await act(async () => {
            root.render(<LovItens isOpen setLovOpen={jest.fn()} onSelect={onSelect} />);
        });
        const input = container.querySelector('[aria-label="Quantidade do item 1"]');
        expect(input.value).toBe('12');
        expect(container.querySelector('[aria-label="Quantidade do item 2"]').value).toBe('5');
        expect(getItensDetalhados).toHaveBeenCalledWith({ codItens: [1] });

        function editar(valor) {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, valor);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await act(async () => { input.click(); editar('13'); });
        expect(container.querySelectorAll('tbody input[type="checkbox"]:checked')).toHaveLength(0);
        await act(async () => {
            container.querySelectorAll('tbody input[type="checkbox"]').forEach(check => check.click());
        });
        await act(async () => { input.click(); input.closest('td').click(); });
        expect(container.querySelectorAll('tbody input[type="checkbox"]:checked')).toHaveLength(2);
        const adicionar = [...container.querySelectorAll('button')]
            .find(button => button.textContent === 'Adicionar selecionados');
        await act(async () => { adicionar.click(); });
        expect(onSelect).not.toHaveBeenCalled();
        expect(container.querySelector('[role="alert"]').textContent).toContain('múltipla de 12');
        await act(async () => { editar('24'); });
        await act(async () => { adicionar.click(); });
        expect(onSelect).toHaveBeenCalledWith([
            expect.objectContaining({ cod_item: 1, cod_um: 'CX', quantidade: 24 }),
            expect.objectContaining({ cod_item: 2, cod_um: 'UN', quantidade: 5 })
        ]);
    } finally {
        await act(async () => root.unmount());
        container.remove();
        delete global.IS_REACT_ACT_ENVIRONMENT;
    }
});
