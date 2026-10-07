import { useEffect } from 'react';

export function useDadosClientePedido({
    cliente,
    clienteRestaurado,
    setClienteDetalhado,
    setRepresentante,
    setOperacao,
    setCondPgto,
    setPrazoMedioVenda,
    setClienteConsumidor,
    setCreditoCliente,
    setCodRepresentanteDigitado,
    setCodOperacaoDigitado,
    setCodCondPgtoDigitado,
    setObservacoes,
    setHistoricoCliente,
    setLoadingDadosCliente,
    setObsEditando,
    setOpenObsModal,
    carregarRepresentanteCliente,
    buscarDetalhesClientePedido,
    carregarObservacoesCliente,
    carregarHistoricoCliente
}) {
    useEffect(() => {
        if (cliente && cliente === clienteRestaurado.current) return;
        if (!cliente) {
            setClienteDetalhado(null);
            setRepresentante(null);
            setOperacao({ cod_oper: null, des_oper: null });
            setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
            setPrazoMedioVenda(null);
            setClienteConsumidor(false);
            setCreditoCliente({ atingido: null, limiteMensal: null, titulosVencidos: null });
            setCodRepresentanteDigitado('');
            setCodOperacaoDigitado('');
            setCodCondPgtoDigitado('');
            setObservacoes([]);
            setHistoricoCliente({ loading: false, ultimaCompra: null, erro: false });
            setLoadingDadosCliente(false);
            setObsEditando(null);
            setOpenObsModal(false);
            return;
        }

        const codCliente = String(cliente.cod_pessoa ?? '').trim();
        let carregamentoCancelado = false;

        setLoadingDadosCliente(true);

        const representantePromise = carregarRepresentanteCliente(codCliente);
        const detalhesClientePromise = buscarDetalhesClientePedido(cliente);
        const observacoesPromise = carregarObservacoesCliente(codCliente);
        const historicoPromise = carregarHistoricoCliente(codCliente);

        representantePromise.then(representanteCliente => {
            if (carregamentoCancelado) return;

            setRepresentante(representanteCliente);
            setCodRepresentanteDigitado(representanteCliente?.cod_pessoa_rep || '');
        }).catch(() => {
            if (carregamentoCancelado) return;

            setRepresentante(null);
            setCodRepresentanteDigitado('');
        });

        detalhesClientePromise.then(dadosClientePedido => {
            if (carregamentoCancelado) return;

            setClienteDetalhado(dadosClientePedido || null);
            setOperacao({
                cod_oper: dadosClientePedido?.cod_oper || null,
                des_oper: dadosClientePedido?.des_oper || null
            });
            setCodOperacaoDigitado(dadosClientePedido?.cod_oper || '');
            setCondPgto({
                cod_cond_pgto: dadosClientePedido?.cod_cond_pgto || null,
                des_cond_pgto: dadosClientePedido?.des_cond_pgto || null
            });
            const numeroOuNull = valor => {
                if (valor === null || valor === undefined || valor === '') return null;
                const numero = Number(valor);
                return Number.isFinite(numero) ? numero : null;
            };
            const pmv = numeroOuNull(dadosClientePedido?.pmv);
            const atingido = numeroOuNull(dadosClientePedido?.atingido);
            const limiteMensal = numeroOuNull(dadosClientePedido?.vlr_lim_mensal);
            const titulosVencidos = numeroOuNull(dadosClientePedido?.qtd_titulos_vencidos);
            setPrazoMedioVenda(pmv);
            setClienteConsumidor(Number(dadosClientePedido?.ind_consumidor) === 1);
            setCreditoCliente({
                atingido,
                limiteMensal,
                titulosVencidos
            });
            setCodCondPgtoDigitado(dadosClientePedido?.cod_cond_pgto || '');
        }).catch(() => {
            if (carregamentoCancelado) return;

            setClienteDetalhado(null);
            setOperacao({ cod_oper: null, des_oper: null });
            setCodOperacaoDigitado('');
            setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
            setPrazoMedioVenda(null);
            setClienteConsumidor(false);
            setCreditoCliente({ atingido: null, limiteMensal: null, titulosVencidos: null });
            setCodCondPgtoDigitado('');
        });

        Promise.allSettled([
            representantePromise,
            detalhesClientePromise,
            observacoesPromise,
            historicoPromise
        ]).finally(() => {
            if (!carregamentoCancelado) {
                setLoadingDadosCliente(false);
            }
        });

        return () => {
            carregamentoCancelado = true;
        };
    }, [cliente]);
}
