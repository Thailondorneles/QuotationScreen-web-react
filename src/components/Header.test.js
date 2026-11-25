import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { MenuPrincipal } from '../views/MenuPrincipal';

jest.mock('react-router-dom', () => {
    global.TextEncoder = require('util').TextEncoder;
    global.TextDecoder = require('util').TextDecoder;
    return require('../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });

function LocalAtual() {
    const { pathname, search } = useLocation();
    return <output>{pathname}{search}</output>;
}

test.each(['logo', 'menu lateral'])('volta de Pedidos ao menu principal pelo %s preservando os parâmetros', async (origem) => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
        await act(async () => root.render(<MemoryRouter initialEntries={['/pedidos?usuario=1']}>
            <LocalAtual /><Routes><Route path="/" element={<><Header /><Outlet /></>}>
                <Route index element={<MenuPrincipal />} />
                <Route path="pedidos" element={<h1>Listagem de pedidos</h1>} />
            </Route></Routes>
        </MemoryRouter>));
        if (origem === 'menu lateral') {
            await act(async () => container.querySelector('[aria-label="Abrir menu"]').click());
        }
        const link = origem === 'logo' ? '[aria-label="Voltar ao menu principal"]' : 'nav a';
        await act(async () => container.querySelector(link).click());
        expect(container.querySelector('output').textContent).toBe('/?usuario=1');
        expect(container.querySelector('h1').textContent).toBe('Bem-vindo!');
        expect(container.querySelector('[role="dialog"]')).toBeNull();
    } finally {
        await act(async () => root.unmount());
        container.remove();
        delete global.IS_REACT_ACT_ENVIRONMENT;
    }
});
