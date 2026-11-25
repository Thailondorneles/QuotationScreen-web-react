import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { consultarSessao, entrar } from '../services/sessao';
import { SessaoAplicacao } from './SessaoAplicacao';

jest.mock('../services/sessao', () => ({ consultarSessao: jest.fn(), entrar: jest.fn() }));
jest.mock('../config/apis', () => ({
    unimedApi: { interceptors: { response: { use: jest.fn(), eject: jest.fn() } } }
}));

let container;
let root;

beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    consultarSessao.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
    delete global.IS_REACT_ACT_ENVIRONMENT;
});

async function abrirAplicacao(prepararAplicacao, abrirMenuPrincipal) {
    await act(async () => root.render(
        <SessaoAplicacao prepararAplicacao={prepararAplicacao} abrirMenuPrincipal={abrirMenuPrincipal}>
            <div data-testid="conteudo">Demandas</div>
        </SessaoAplicacao>
    ));
}

test('mantém o formulário em Entrando até confirmar a sessão e abrir o menu', async () => {
    let confirmar;
    let liberarParametros;
    consultarSessao.mockRejectedValueOnce({ response: { status: 401 } })
        .mockImplementationOnce(() => new Promise(resolve => { confirmar = resolve; }));
    entrar.mockResolvedValueOnce();
    const abrirMenu = jest.fn();
    await abrirAplicacao(() => new Promise(resolve => { liberarParametros = resolve; }), abrirMenu);

    const formulario = container.querySelector('form');
    formulario.elements.usuario.value = 'teste';
    formulario.elements.senha.value = 'senha-ficticia';
    await act(async () => formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

    expect(entrar).toHaveBeenCalledWith('teste', 'senha-ficticia');
    expect(container.querySelector('form')).toBe(formulario);
    expect(formulario.querySelector('button').textContent).toBe('Entrando…');
    expect(container.querySelector('[data-testid="conteudo"]')).toBeNull();

    await act(async () => confirmar({ usuario: { codigoPessoa: 123 }, validadeMs: 2000 }));
    expect(formulario.querySelector('button').textContent).toBe('Entrando…');
    expect(formulario.elements.usuario.value).toBe('teste');
    expect(formulario.elements.senha.value).toBe('senha-ficticia');
    expect(abrirMenu).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="conteudo"]')).toBeNull();
    await act(async () => liberarParametros());
    expect(abrirMenu).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="conteudo"]')).not.toBeNull();
});

test('responde a uma sessão ausente com a tela de login e mantém a área interna desmontada', async () => {
    consultarSessao.mockRejectedValue({ response: { status: 401 } });
    await abrirAplicacao();

    expect(container.querySelector('[data-testid="conteudo"]')).toBeNull();
    expect(container.querySelector('input[autocomplete="username"]')).not.toBeNull();
    expect(container.querySelector('button').disabled).toBe(false);
});

test('usa a sessão existente ao abrir a tela e consulta novamente no prazo indicado', async () => {
    consultarSessao.mockResolvedValue({ usuario: { codigoPessoa: 123 }, validadeMs: 2000 });
    await abrirAplicacao();

    expect(container.querySelector('[data-testid="conteudo"]')).not.toBeNull();
    expect(container.querySelector('form')).toBeNull();
    expect(consultarSessao).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTime(2000));
    expect(consultarSessao).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-testid="conteudo"]')).not.toBeNull();
});

test('uma falha temporária permite verificar a mesma sessão sem refazer o login', async () => {
    consultarSessao.mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValue({ usuario: { codigoPessoa: 123 }, validadeMs: 2000 });
    await abrirAplicacao();

    const botao = [...container.querySelectorAll('button')]
        .find(elemento => elemento.textContent === 'Verificar sessão novamente');
    expect(botao).toBeDefined();
    await act(async () => botao.click());

    expect(consultarSessao).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-testid="conteudo"]')).not.toBeNull();
});
