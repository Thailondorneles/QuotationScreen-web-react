import { dataCargaParaIso } from "../../../utils/dataCarga";
import { reservarSequenciaPedido, salvarCabecalhoPedido } from "../../../services/pedidosWeb";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesPersistencia({
    cliente,
    operacao,
    CondPgto,
    cobrancaFrete,
    dataCargaDigitada,
    sequenciaPedido,
    cabecalhoSalvo,
    representante,
    clienteConsumidor,
    modalidadeIntegracao,
    opcaoFrete,
    ordemCompra,
    clienteTriangulacao,
    operacaoTriangulacao,
    operacaoPersistencia,
    setLoading,
    navigate,
    location,
    setModalErro,
    clienteRestaurado,
    setCotacoesFrete,
    setDataCargaDigitada,
    setOpenLovItens,
    setOpenLovPessoas,
    setOpenLovTriangulacao,
    setOpenLovRepresentantes,
    setOpenLovOperacoes,
    setOpenLovOperacoesTriangulacao,
    setOpenLovCondPgto,
    setOpenLovCidades,
    setOpenLovUf,
    setOpenLovCep,
    setOpenLovEnderecos,
    setCliente,
    setClienteDetalhado,
    setClienteTriangulacao,
    setRepresentante,
    setOperacao,
    setOperacaoTriangulacao,
    setCondPgto,
    setPrazoMedioVenda,
    setClienteConsumidor,
    setModalidadeIntegracao,
    setMenuModalidadeIntegracaoOpen,
    setOpcaoFrete,
    setCobrancaFrete,
    setMenuOpcaoFreteOpen,
    setCreditoCliente,
    setCodClienteDigitado,
    setCodClienteTriangulacaoDigitado,
    setCodRepresentanteDigitado,
    setCodOperacaoDigitado,
    setCodOperacaoTriangulacaoDigitado,
    setCodCondPgtoDigitado,
    setItensPedido,
    setFreteSelecionado,
    setObservacoes,
    setHistoricoCliente,
    setLoadingDadosCliente,
    setOpenObsModal,
    setObsEditando,
    setOrdemCompra,
    setMenuSelecaoItensOpen,
    setModalEmitirProposta,
    setGerandoProposta,
    setModalSucesso,
    nextId,
    nextNumItem,
    limparEnderecoCep
}) {
    async function persistirCabecalho(alteracoes = {}) {
        if (!cliente?.cod_pessoa || !operacao?.cod_oper || !CondPgto?.cod_cond_pgto) {
            throw new Error('Informe cliente, operação e condição de pagamento para salvar.');
        }
        const numero = valor => valor === '' || valor == null ? null : Number(valor);
        const textoFrete = String(cobrancaFrete.valor);
        const valorFrete = Number(textoFrete.includes(',') ? textoFrete.replace(/\./g, '').replace(',', '.') : textoFrete);
        if (!Number.isFinite(valorFrete) || valorFrete < 0) throw new Error('Informe uma cobrança de frete válida.');
        if (dataCargaDigitada && !dataCargaParaIso(dataCargaDigitada)) throw new Error('Informe uma data da carga válida no formato dd/mm/aaaa.');
        if (!sequenciaPedido.current) sequenciaPedido.current = await reservarSequenciaPedido();
        const anterior = cabecalhoSalvo.current || {};
        const payload = {
            numSeqPedido: sequenciaPedido.current,
            numPedidoMatriz: anterior.numPedidoMatriz ?? null,
            numPedidoFilial: anterior.numPedidoFilial ?? null,
            codCliente: numero(cliente.cod_pessoa), codRep: numero(representante?.cod_pessoa_rep),
            codOper: numero(operacao.cod_oper), codCondPgto: numero(CondPgto.cod_cond_pgto),
            indConsumidor: clienteConsumidor ? 1 : 0, codModalidade: Number(modalidadeIntegracao),
            tipFrete: opcaoFrete === 'COBRAR_NF' ? 1 : 0,
            indDestaqueFrete: cobrancaFrete.tipo === 'VALOR' ? 1 : 0, vlrFrete: valorFrete,
            desNumOcCliente: ordemCompra || null,
            codClienteRemessa: numero(clienteTriangulacao?.cod_pessoa),
            codOperRemessa: numero(operacaoTriangulacao?.cod_oper),
            statusCotacao: anterior.statusCotacao ?? 0, dtaCarga: dataCargaParaIso(dataCargaDigitada),
            codPortadorMatriz: anterior.codPortadorMatriz ?? 161,
            codPortadorFilial: anterior.codPortadorFilial ?? 203,
            codPosicaoMatriz: anterior.codPosicaoMatriz ?? 22,
            codPosicaoFilial: anterior.codPosicaoFilial ?? 22,
            ...alteracoes
        };
        await salvarCabecalhoPedido(payload);
        cabecalhoSalvo.current = payload;
        return payload.numSeqPedido;
    }

    async function salvarCotacao() {
        if (operacaoPersistencia.current) return;
        operacaoPersistencia.current = true;
        setLoading(true);
        try {
            await persistirCabecalho();
            navigate(`/${location.search}`);
        } catch (error) {
            setModalErro({ aberto: true, mensagem: error.response?.data?.erro || error.message });
        } finally {
            operacaoPersistencia.current = false;
            setLoading(false);
        }
    }

    function novaCotacao() {
        navigate(`/${location.search}`);
    }

    function limparTelaPedidoVenda() {
        sequenciaPedido.current = null;
        cabecalhoSalvo.current = null;
        clienteRestaurado.current = null;
        setCotacoesFrete({ 201: [], 203: [] });
        setDataCargaDigitada('');
        setOpenLovItens(false);
        setOpenLovPessoas(false);
        setOpenLovTriangulacao(false);
        setOpenLovRepresentantes(false);
        setOpenLovOperacoes(false);
        setOpenLovOperacoesTriangulacao(false);
        setOpenLovCondPgto(false);
        setOpenLovCidades(false);
        setOpenLovUf(false);
        setOpenLovCep(false);
        setOpenLovEnderecos(false);
        setCliente(null);
        setClienteDetalhado(null);
        setClienteTriangulacao(null);
        setRepresentante(null);
        setOperacao({ cod_oper: null, des_oper: null });
        setOperacaoTriangulacao({ cod_oper: null, des_oper: null });
        setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
        setPrazoMedioVenda(null);
        setClienteConsumidor(false);
        setModalidadeIntegracao(2);
        setMenuModalidadeIntegracaoOpen(false);
        setOpcaoFrete('CIF');
        setCobrancaFrete({ tipo: 'PERCENTUAL', valor: '100' });
        setMenuOpcaoFreteOpen(false);
        setCreditoCliente({ atingido: null, limiteMensal: null, titulosVencidos: null });
        setCodClienteDigitado('');
        setCodClienteTriangulacaoDigitado('');
        setCodRepresentanteDigitado('');
        setCodOperacaoDigitado('');
        setCodOperacaoTriangulacaoDigitado('');
        setCodCondPgtoDigitado('');
        setItensPedido([]);
        setFreteSelecionado({ 201: null, 203: null });
        setObservacoes([]);
        setHistoricoCliente({ loading: false, ultimaCompra: null, erro: false });
        setLoadingDadosCliente(false);
        setOpenObsModal(false);
        setObsEditando(null);
        setOrdemCompra('');
        setMenuSelecaoItensOpen(null);
        setModalEmitirProposta(false);
        setGerandoProposta(false);
        setModalErro({
            aberto: false,
            mensagem: '',
            seqItem: null,
            focusSelector: null
        });
        setModalSucesso({
            aberto: false,
            mensagem: '',
            limparAoFechar: false
        });
        nextId.current = 1;
        nextNumItem.current = 1;
        limparEnderecoCep();
    }

    return { persistirCabecalho, salvarCotacao, novaCotacao, limparTelaPedidoVenda };
}
