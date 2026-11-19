import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { SugestaoVisita } from './SugestaoVisita';
import { consultarVendasCliente } from '../../services/demandaContratos/vendas';
import { periodoVisita } from '../../domain/demandaContratos/sugestoes';
jest.mock('../../services/demandaContratos/vendas', () => ({ consultarVendasCliente: jest.fn() }));

test('combina seleção de novos itens e ampliação, permite editar e remover sem duplicar', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    consultarVendasCliente.mockResolvedValue([{ cod_cliente: 1, cod_item: 20, des_item: 'Novo material', marca: 'Marca', dta_emissao: periodoVisita().fim, quantidade: 14, vlr_total: 140 }]);
    const container = document.createElement('div'); document.body.appendChild(container);
    const root = createRoot(container);
    const itens = [{ cod_item: 10, des_item: 'Material de contrato', cod_completo: 'Marca', origem: '14', num_pedido: 140,
        pedido37: 370, vencido: false, quantidade: 10, media: 20, efetividade: 200, vlr_uni_bruto: 5, totalConsumido: 20 }];
    try {
        await act(async () => root.render(<SugestaoVisita codigo={1} cliente={{ cod_pessoa: 1, des_pessoa: 'Cliente', des_consultor: 'Consultor' }} itensContratos={itens} />));
        await act(async () => Simulate.change(container.querySelector('[aria-label="Selecionar novo item 20"]')));
        await act(async () => Simulate.change(container.querySelector('[aria-label="Selecionar item 10 para ampliar contrato 140"]')));
        expect(container.textContent).toContain('Itens para possível acordo · 2 itens');
        expect(container.querySelector('[aria-label="Quantidade mensal do item 20"]').value).toBe('2');
        const preco = container.querySelector('[aria-label="Preço unitário do item 20"]');
        await act(async () => Simulate.change(preco, { target: { value: '15,50' } }));
        expect(container.textContent).toContain('131,00');
        await act(async () => container.querySelector('[aria-label="Remover item 20"]').click());
        expect(container.querySelector('[aria-label="Selecionar novo item 20"]').checked).toBe(false);
        expect(container.textContent).toContain('Itens para possível acordo · 1 itens');
    } finally {
        await act(async () => root.unmount()); container.remove(); delete global.IS_REACT_ACT_ENVIRONMENT;
    }
});
