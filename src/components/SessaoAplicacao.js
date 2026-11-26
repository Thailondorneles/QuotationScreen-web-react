import { useEffect, useRef, useState } from 'react';
import { Login } from '../views/Login';
import { unimedApi } from '../config/apis';
import { CANAL_SESSAO, consultarSessao } from '../services/sessao';
import { SessaoContext } from '../config/SessaoContext';

export function SessaoAplicacao({ children, prepararAplicacao, abrirMenuPrincipal }) {
    const [estado, setEstado] = useState({ carregando: true });
    const verificarSessao = useRef(null);

    useEffect(() => {
        const canal = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CANAL_SESSAO) : null;
        let codigoPessoa;
        let consulta;
        let temporizador;
        let recarregando = false;
        let ultimaAtualizacao = 0;

        function recarregar() {
            if (recarregando) return;
            recarregando = true;
            window.location.reload();
        }

        async function verificar(aposLogin = false) {
            if (recarregando || (consulta && aposLogin !== true)) return;
            if (aposLogin === true) canal?.postMessage('sessao-alterada');
            consulta?.abort();
            const controller = new AbortController();
            consulta = controller;
            try {
                const sessao = await consultarSessao(controller.signal);
                if (controller.signal.aborted || recarregando) return;
                if (codigoPessoa && codigoPessoa !== sessao.usuario.codigoPessoa) {
                    recarregar();
                    return;
                }
                const expiraEm = Date.now() + sessao.validadeMs;
                if (!codigoPessoa && prepararAplicacao) {
                    await prepararAplicacao();
                    if (controller.signal.aborted || recarregando) return;
                }
                if (aposLogin === true && abrirMenuPrincipal) {
                    await abrirMenuPrincipal();
                    if (controller.signal.aborted || recarregando) return;
                }
                codigoPessoa = sessao.usuario.codigoPessoa;
                setEstado({ sessao: { usuario: sessao.usuario, expiraEm } });
                clearTimeout(temporizador);
                temporizador = setTimeout(verificar, Math.min(Math.max(0, expiraEm - Date.now()), 2147483647));
            } catch (error) {
                if (controller.signal.aborted || recarregando) return;
                clearTimeout(temporizador);
                if (error.response?.status === 401) {
                    if (codigoPessoa) recarregar();
                    else if (aposLogin === true) setEstado({ erro: 'O navegador não confirmou a sessão. Tente verificar novamente.' });
                    else setEstado({});
                } else {
                    setEstado({ erro: 'Não foi possível confirmar a sessão. Tente verificar novamente.' });
                }
            } finally {
                if (consulta === controller) consulta = undefined;
            }
        }

        function aoRestaurar(event) {
            if (event.persisted) recarregar();
        }

        const interceptor = unimedApi.interceptors.response.use(response => {
            const prazo = Number(response.headers?.['x-sessao-expira-em']);
            const validadaEm = Number(response.headers?.['x-sessao-validada-em']);
            const dataServidor = Date.parse(response.headers?.date);
            if (codigoPessoa && prazo > 0 && validadaEm >= ultimaAtualizacao) {
                ultimaAtualizacao = validadaEm;
                const expiraEm = Number.isFinite(dataServidor) ? Date.now() + prazo - dataServidor : prazo;
                setEstado(atual => atual.sessao ? { sessao: { ...atual.sessao, expiraEm } } : atual);
                clearTimeout(temporizador);
                temporizador = setTimeout(verificar, Math.min(Math.max(0, expiraEm - Date.now()), 2147483647));
            }
            return response;
        }, error => {
            if (codigoPessoa && error.response?.status === 401 &&
                error.response.data?.codigo === 'SESSAO_INVALIDA') recarregar();
            return Promise.reject(error);
        });
        if (canal) canal.onmessage = event => {
            if (event.data === 'sessao-alterada') recarregar();
        };
        window.addEventListener('focus', verificar);
        window.addEventListener('pageshow', aoRestaurar);
        verificarSessao.current = verificar;
        verificar();

        return () => {
            verificarSessao.current = null;
            consulta?.abort();
            clearTimeout(temporizador);
            canal?.close();
            unimedApi.interceptors.response.eject(interceptor);
            window.removeEventListener('focus', verificar);
            window.removeEventListener('pageshow', aoRestaurar);
        };
    }, [prepararAplicacao, abrirMenuPrincipal]);

    if (estado.sessao) return <SessaoContext.Provider value={estado.sessao}>{children}</SessaoContext.Provider>;
    return <Login carregando={estado.carregando} erroSessao={estado.erro}
        onLoginConfirmado={() => verificarSessao.current?.(true)} onVerificarSessao={() => {
        setEstado({ carregando: true });
        verificarSessao.current?.();
    }} />;
}
