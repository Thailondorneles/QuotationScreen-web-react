import { useEffect, useRef, useState } from 'react';
import { Login } from '../views/Login';
import { unimedApi } from '../config/apis';
import { CANAL_SESSAO, consultarSessao } from '../services/sessao';

export function SessaoAplicacao({ children }) {
    const [estado, setEstado] = useState({ carregando: true });
    const verificarSessao = useRef(null);

    useEffect(() => {
        const canal = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CANAL_SESSAO) : null;
        let codigoPessoa;
        let consulta;
        let temporizador;
        let recarregando = false;

        function recarregar() {
            if (recarregando) return;
            recarregando = true;
            window.location.reload();
        }

        async function verificar(aposLogin = false) {
            if (recarregando || (consulta && aposLogin !== true)) return;
            if (aposLogin === true && codigoPessoa) {
                recarregar();
                return;
            }
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
                codigoPessoa = sessao.usuario.codigoPessoa;
                setEstado({ autenticado: true });
                clearTimeout(temporizador);
                temporizador = setTimeout(verificar, Math.min(sessao.validadeMs, 2147483647));
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

        const interceptor = unimedApi.interceptors.response.use(undefined, error => {
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
    }, []);

    if (estado.autenticado) return children;
    return <Login carregando={estado.carregando} erroSessao={estado.erro}
        onLoginConfirmado={() => verificarSessao.current?.(true)} onVerificarSessao={() => {
        setEstado({ carregando: true });
        verificarSessao.current?.();
    }} />;
}
