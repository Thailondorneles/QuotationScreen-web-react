import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

export function useConfirmarSaida({ assinaturaAtual, assinaturaSalva, carregandoPedido,
    erroCarregamentoPedido, sequenciaPedido, idRota }) {
    const inicial = useRef(null);
    const rota = useRef(idRota);
    if (rota.current !== idRota) {
        rota.current = idRota;
        inicial.current = null;
    }
    const pronto = !carregandoPedido && !erroCarregamentoPedido &&
        (!idRota || String(sequenciaPedido.current) === String(idRota));
    useEffect(() => {
        if (pronto && inicial.current === null) inicial.current = assinaturaAtual;
    }, [pronto, assinaturaAtual]);

    const temAlteracoes = () => pronto && inicial.current !== null &&
        assinaturaAtual !== (assinaturaSalva.current ?? inicial.current);
    const blocker = useBlocker(({ currentLocation, nextLocation }) =>
        (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search) && temAlteracoes());

    useEffect(() => {
        if (blocker.state !== 'blocked') return;
        if (window.confirm('Existem alterações não salvas no pedido. Deseja sair sem salvar as alterações?')) {
            blocker.proceed();
        } else {
            blocker.reset();
        }
    }, [blocker]);

    useEffect(() => {
        const aoSair = event => {
            if (!temAlteracoes()) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', aoSair);
        return () => window.removeEventListener('beforeunload', aoSair);
    });
}
