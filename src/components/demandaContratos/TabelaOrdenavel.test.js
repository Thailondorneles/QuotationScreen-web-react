import { act, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { TabelaOrdenavel } from './TabelaOrdenavel';

test('ordena meses numericamente por padrão e alterna o sentido pelo cabeçalho', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div'); document.body.appendChild(container);
    const root = createRoot(container);
    try {
        await act(async () => root.render(<TabelaOrdenavel ordemInicial={{ coluna: 'Meses com compra', direcao: 'desc' }}><thead><tr><th>Item</th><th>Meses com compra</th><th>Valor</th></tr></thead><tbody>
            <tr key="a"><td>Item A</td><td>2 de 7</td><td>R$ 1.000,00</td></tr>
            <tr key="b"><td>Item B</td><td>7 de 7</td><td>R$ 200,00</td></tr>
        </tbody></TabelaOrdenavel>));
        expect(container.querySelector('tbody tr').textContent).toContain('Item B');
        await act(async () => container.querySelectorAll('th button')[1].click());
        expect(container.querySelector('tbody tr').textContent).toContain('Item A');
        expect(container.querySelectorAll('th')[1].getAttribute('aria-sort')).toBe('ascending');
        await act(async () => container.querySelectorAll('th button')[2].click());
        expect(container.querySelector('tbody tr').textContent).toContain('Item B');
    } finally { await act(async () => root.unmount()); container.remove(); delete global.IS_REACT_ACT_ENVIRONMENT; }
});

test('mantém detalhes junto do grupo e ordena os valores de inputs como decimais', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div'); document.body.appendChild(container);
    const root = createRoot(container);
    try {
        await act(async () => root.render(<TabelaOrdenavel><thead><tr><th>Pedido</th><th>Preço</th></tr></thead><tbody>
            <Fragment key="a"><tr><td>Pedido A</td><td><input readOnly value="100.01" /></td></tr><tr><td colSpan={2}>Detalhe A</td></tr></Fragment>
            <Fragment key="b"><tr><td>Pedido B</td><td><input readOnly value="999" /></td></tr><tr><td colSpan={2}>Detalhe B</td></tr></Fragment>
        </tbody></TabelaOrdenavel>));
        await act(async () => container.querySelectorAll('th button')[1].click());
        expect([...container.querySelectorAll('tbody tr')].map(linha => linha.textContent)).toEqual(['Pedido A', 'Detalhe A', 'Pedido B', 'Detalhe B']);
        await act(async () => container.querySelectorAll('th button')[1].click());
        expect([...container.querySelectorAll('tbody tr')].map(linha => linha.textContent)).toEqual(['Pedido B', 'Detalhe B', 'Pedido A', 'Detalhe A']);
    } finally { await act(async () => root.unmount()); container.remove(); delete global.IS_REACT_ACT_ENVIRONMENT; }
});
