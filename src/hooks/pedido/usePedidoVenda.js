import { assinaturaCotacao } from '../../domain/pedido/assinaturaCotacao';
import { useConfirmarSaida } from './useConfirmarSaida';
import { useCarregarCotacao } from './useCarregarCotacao';
import { useConsultasItensPedido } from './useConsultasItensPedido';
import { useDadosClientePedido } from './useDadosClientePedido';
import { useEstadoPedido } from './useEstadoPedido';

import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useEffect, useMemo } from 'react';

import { calcularCobrancaFrete } from "../../utils/cobrancaFrete.js";

import { criarCalculosPedido } from '../../domain/pedido/calculos';
import { listaPrecoEhPromocional, listaPrecoEhContrato, itemPossuiAcordo, itemPossuiUltimaCompra, itemPossuiPrecoListaBloqueado, itemSemTributacao, getDestaqueClassificacao, getClasseLinhaItem, getCodigoUnidadeCompra, getPedidosAcordoTexto, formatarDataUltimaCompraItem, formatarDataHistoricoCliente } from '../../domain/pedido/regrasItens';
import { dataAtualErp, apenasNumeros, limparCamposVazios, numeroDecimalBR, valorDecimalErp } from '../../domain/pedido/formatacao';
import { criarValidacoesPedido } from '../../domain/pedido/validacoes';
import { criarMapeadoresPedido } from '../../domain/pedido/mapeadores';
import { criarAcoesPersistencia } from './acoes/persistencia';
import { criarAcoesClientes } from './acoes/clientes';
import { criarAcoesOperacoes } from './acoes/operacoes';
import { criarAcoesPrecificacao } from './acoes/precificacao';
import { criarAcoesItens } from './acoes/itens';
import { criarAcoesEnderecos } from './acoes/enderecos';
import { criarAcoesFrete } from './acoes/frete';
import { criarAcoesObservacoes } from './acoes/observacoes';
import { criarAcoesIntegracao } from './acoes/integracao';
import { criarAcoesProposta } from './acoes/proposta';
import { mapComConcorrencia } from '../../utils/mapComConcorrencia';

export function usePedidoVenda() {
    const navigate = useNavigate();
    const location = useLocation();
    const { numSeqPedido: idRota } = useParams();
    const estado = useEstadoPedido(idRota);
    const assinaturaAtual = assinaturaCotacao(estado);
    useConfirmarSaida({ ...estado, idRota, assinaturaAtual });
    const {
        itensPedido,
        freteSelecionado,
        opcaoFrete,
        cobrancaFrete,
        setItensPedido,
        ordenacaoItens,
        creditoCliente,
        prazoMedioVenda
    } = estado;

    const cobrancaCalculada = calcularCobrancaFrete(itensPedido, freteSelecionado, opcaoFrete, cobrancaFrete);
    const chaveRateioFrete = JSON.stringify(itensPedido.map(item => [item.seq, item.unidade, item.selecionado, item.quantidade, item.pesoBruto, item.qtdM3]));
    // Cada fábrica recebe os dados deste render. Os encaminhamentos abaixo conectam
    // os módulos sem duplicar estado nem executar consultas durante a composição.
    const calculosPedido = criarCalculosPedido({
        ...estado,
        cobrancaCalculada,
        numeroDecimalBR
    });

    const validacoesPedido = criarValidacoesPedido({
        ...estado,
        itemSemTributacao
    });

    const mapeadoresPedido = criarMapeadoresPedido({
        ...estado,
        limparCamposVazios,
        getCodigoTipoLogradouro,
        apenasNumeros,
        dataAtualErp,
        valorDecimalErp,
        cobrancaCalculada,
        getUsuarioIntegracao,
        validarPedidoErp
    });

    const acoesPersistencia = criarAcoesPersistencia({
        ...estado,
        assinaturaAtual,
        navigate,
        location,
        limparEnderecoCep
    });

    const acoesClientes = criarAcoesClientes({
        ...estado,
        limparEnderecoCep,
        mapComConcorrencia,
        buscarDadosItemComTentativas
    });

    const acoesOperacoes = criarAcoesOperacoes({
        ...estado,
        mapComConcorrencia,
        buscarDadosItem
    });

    const acoesPrecificacao = criarAcoesPrecificacao({
        ...estado,
        mapComConcorrencia,
        listaPrecoEhPromocional,
        listaPrecoEhContrato,
        getCodigoPessoaCliente
    });

    const acoesItens = criarAcoesItens({
        ...estado,
        buscarDadosItem,
        mapComConcorrencia,
        numeroDecimalBR,
        calcularPercentualMaximoSobra,
        calcularValorListaPorSobra,
        itemSemTributacao
    });

    const acoesEnderecos = criarAcoesEnderecos({
        ...estado,
        getCodigoPessoaCliente
    });

    const acoesFrete = criarAcoesFrete({
        ...estado,
        temEnderecoEntrega,
        apenasNumeros,
        buscarDetalhesClientePedido
    });

    const acoesObservacoes = criarAcoesObservacoes(estado);

    const acoesIntegracao = criarAcoesIntegracao({
        ...estado,
        obterItensSelecionadosPorUnidades,
        calcularValoresItem,
        getPercentualMinimoSobraPorClassificacao,
        getNomeClassificacaoSobra,
        validarPedidoErp,
        persistirPedido,
        montarPayloadsPedidoErp
    });

    const acoesProposta = criarAcoesProposta({
        ...estado,
        obterDadosPropostaTela
    });

    useEffect(() => {
        aplicarRateioFrete(freteSelecionado);
    }, [chaveRateioFrete, freteSelecionado]);
    useEffect(() => {
        setItensPedido(prev => prev.some(item => item.sobraDesejada != null)
            ? prev.map(item => ({ ...item, sobraDesejada: null })) : prev);
    }, [opcaoFrete, cobrancaFrete, freteSelecionado]);

    useCarregarCotacao({ ...estado, idRota, buscarDadosItem });

    async function persistirPedido(...args) { return acoesPersistencia.persistirPedido(...args); }

    async function salvarCotacao(...args) { return acoesPersistencia.salvarCotacao(...args); }

    function novaCotacao(...args) { return acoesPersistencia.novaCotacao(...args); }

    const codigosItensPedido = useMemo(
        () => [...new Set(itensPedido.map(item => String(item.cod_item)).filter(Boolean))].sort().join(','),
        [itensPedido]
    );

    useConsultasItensPedido({ ...estado, codigosItensPedido });

    function validarOrdemCompra(...args) { return acoesObservacoes.validarOrdemCompra(...args); }

    function getDescricaoUf(...args) { return acoesEnderecos.getDescricaoUf(...args); }

    function getCodigoTipoLogradouro(...args) { return acoesEnderecos.getCodigoTipoLogradouro(...args); }

    function getCodigoPessoaCliente(...args) { return acoesClientes.getCodigoPessoaCliente(...args); }

    function limparEnderecoCep(...args) { return acoesEnderecos.limparEnderecoCep(...args); }

    function limparTelaPedidoVenda(...args) { return acoesPersistencia.limparTelaPedidoVenda(...args); }

    async function atualizarCliente(...args) { return acoesClientes.atualizarCliente(...args); }

    async function recalcularItensManualmente(...args) { return acoesPrecificacao.recalcularItensManualmente(...args); }

    async function carregarTiposLogradouro(...args) { return acoesEnderecos.carregarTiposLogradouro(...args); }

    async function buscarDadosItem(...args) { return acoesPrecificacao.buscarDadosItem(...args); }

    async function buscarDadosItemComTentativas(...args) { return acoesPrecificacao.buscarDadosItemComTentativas(...args); }

    async function importarItensExcel(...args) { return acoesItens.importarItensExcel(...args); }

    async function adicionarItem(...args) { return acoesItens.adicionarItem(...args); }

    function removerItem(...args) { return acoesItens.removerItem(...args); }

    function handleQuantidadeChange(...args) { return acoesItens.handleQuantidadeChange(...args); }

    function navegarCamposItens(...args) { return acoesItens.navegarCamposItens(...args); }

    function handleValorListaChange(...args) { return acoesItens.handleValorListaChange(...args); }

    function validarValorListaPromocional(...args) { return acoesItens.validarValorListaPromocional(...args); }

    function calcularValorListaPorSobra(...args) { return calculosPedido.calcularValorListaPorSobra(...args); }

    function handleSobraPercentualChange(...args) { return acoesItens.handleSobraPercentualChange(...args); }

    function calcularPercentualMaximoSobra(...args) { return calculosPedido.calcularPercentualMaximoSobra(...args); }

    function aplicarSobraPercentual(...args) { return acoesItens.aplicarSobraPercentual(...args); }

    function validarMultiplo(...args) { return acoesItens.validarMultiplo(...args); }

    function handleCheckboxChange(...args) { return acoesItens.handleCheckboxChange(...args); }

    function selecionarItensPorUnidade(...args) { return acoesItens.selecionarItensPorUnidade(...args); }

    function calcularValoresItem(...args) { return calculosPedido.calcularValoresItem(...args); }

    function getStatusHistoricoCliente(...args) { return acoesClientes.getStatusHistoricoCliente(...args); }

    async function buscarDetalhesClientePedido(...args) { return acoesClientes.buscarDetalhesClientePedido(...args); }

    async function carregarRepresentanteCliente(...args) { return acoesClientes.carregarRepresentanteCliente(...args); }

    async function buscarClientePorCodigo(...args) { return acoesClientes.buscarClientePorCodigo(...args); }

    async function buscarClienteTriangulacaoPorCodigo(...args) { return acoesClientes.buscarClienteTriangulacaoPorCodigo(...args); }

    async function buscarRepresentantePorCodigo(...args) { return acoesClientes.buscarRepresentantePorCodigo(...args); }

    async function buscarOperacaoPorCodigo(...args) { return acoesOperacoes.buscarOperacaoPorCodigo(...args); }

    async function atualizarOperacao(...args) { return acoesOperacoes.atualizarOperacao(...args); }

    async function buscarOperacaoTriangulacaoPorCodigo(...args) { return acoesOperacoes.buscarOperacaoTriangulacaoPorCodigo(...args); }

    async function buscarCondPgtoPorCodigo(...args) { return acoesOperacoes.buscarCondPgtoPorCodigo(...args); }

    async function aplicarCep(...args) { return acoesEnderecos.aplicarCep(...args); }

    async function aplicarEnderecoEntrega(...args) { return acoesEnderecos.aplicarEnderecoEntrega(...args); }

    function abrirLovEnderecos(...args) { return acoesEnderecos.abrirLovEnderecos(...args); }

    async function carregarEnderecoPadraoCliente(...args) { return acoesEnderecos.carregarEnderecoPadraoCliente(...args); }

    async function buscarCepPorCodigo(...args) { return acoesEnderecos.buscarCepPorCodigo(...args); }

    async function buscarCidadePorCodigo(...args) { return acoesEnderecos.buscarCidadePorCodigo(...args); }

    async function carregarUfPorCodigo(...args) { return acoesEnderecos.carregarUfPorCodigo(...args); }

    async function buscarUfPorCodigo(...args) { return acoesEnderecos.buscarUfPorCodigo(...args); }

    async function cotar(...args) { return acoesFrete.cotar(...args); }

    function aplicarRateioFrete(...args) { return acoesFrete.aplicarRateioFrete(...args); }

    function selecionarTransportadora(...args) { return acoesFrete.selecionarTransportadora(...args); }

    function abrirNovaObs(...args) { return acoesObservacoes.abrirNovaObs(...args); }

    function editarObs(...args) { return acoesObservacoes.editarObs(...args); }

    function salvarObs(...args) { return acoesObservacoes.salvarObs(...args); }

    function removerObs(...args) { return acoesObservacoes.removerObs(...args); }

    function getUsuarioIntegracao() {
        const params = new URLSearchParams(window.location.search);

        return (
            params.get('usuario') ||
            params.get('user') ||
            params.get('codUsuario') ||
            params.get('cod_usuario') ||
            ''
        ).trim();
    }

    function validarPedidoErp(...args) { return validacoesPedido.validarPedidoErp(...args); }

    function obterItensSelecionadosPorUnidades(...args) { return mapeadoresPedido.obterItensSelecionadosPorUnidades(...args); }

    function getPercentualMinimoSobraPorClassificacao(...args) { return validacoesPedido.getPercentualMinimoSobraPorClassificacao(...args); }

    function getNomeClassificacaoSobra(...args) { return validacoesPedido.getNomeClassificacaoSobra(...args); }

    function temEnderecoEntrega(...args) { return mapeadoresPedido.temEnderecoEntrega(...args); }

    function montarPayloadsPedidoErp(...args) { return mapeadoresPedido.montarPayloadsPedidoErp(...args); }

    function abrirSelecaoUnidadesPedido(...args) { return acoesIntegracao.abrirSelecaoUnidadesPedido(...args); }

    async function finalizarPedidoErp(...args) { return acoesIntegracao.finalizarPedidoErp(...args); }

    function cancelarEnvioPedidoErp(...args) { return acoesIntegracao.cancelarEnvioPedidoErp(...args); }

    function confirmarEnvioPedidoErp(...args) { return acoesIntegracao.confirmarEnvioPedidoErp(...args); }

    function obterDadosPropostaTela(...args) { return mapeadoresPedido.obterDadosPropostaTela(...args); }

    function abrirEmissaoProposta(...args) { return acoesProposta.abrirEmissaoProposta(...args); }

    async function emitirProposta(...args) { return acoesProposta.emitirProposta(...args); }

    async function carregarObservacoesCliente(...args) { return acoesObservacoes.carregarObservacoesCliente(...args); }

    async function carregarHistoricoCliente(...args) { return acoesClientes.carregarHistoricoCliente(...args); }

    useDadosClientePedido({ ...estado, carregarRepresentanteCliente, buscarDetalhesClientePedido, carregarObservacoesCliente, carregarHistoricoCliente });

    const itensAgrupados = Array.from(
        itensPedido.reduce((grupos, item) => {
            if (!grupos.has(item.grupoId)) {
                grupos.set(item.grupoId, { grupoId: item.grupoId });
            }

            const grupo = grupos.get(item.grupoId);
            grupo[item.unidade] = item;
            return grupos;
        }, new Map()).values()
    );

    const itensAgrupadosOrdenados = !ordenacaoItens.coluna || !ordenacaoItens.direcao
        ? itensAgrupados
        : [...itensAgrupados].sort((grupoA, grupoB) => {
            const itemA = grupoA[201] || grupoA[203];
            const itemB = grupoB[201] || grupoB[203];
            const resultado = String(itemA?.[ordenacaoItens.coluna] ?? '').localeCompare(
                String(itemB?.[ordenacaoItens.coluna] ?? ''),
                'pt-BR',
                { numeric: true, sensitivity: 'base' }
            );

            return ordenacaoItens.direcao === 'asc' ? resultado : -resultado;
        });

    function alternarOrdenacaoItens(...args) { return acoesItens.alternarOrdenacaoItens(...args); }

    const unidadesComItensSelecionados = [...new Set(
        itensPedido.filter(item => item.selecionado).map(item => Number(item.unidade))
    )].sort((a, b) => a - b);
    const totaisPorUnidade = itensPedido
        .filter(item => item.selecionado)
        .reduce((totais, item) => {
            const valores = calcularValoresItem(item);
            const totaisUnidade = totais[item.unidade];
            totaisUnidade.valorVenda += Number(valores.valorVendaTotal || 0);
            totaisUnidade.frete += Number(item.valorFrete || 0);
            totaisUnidade.sobra += Number(valores.sobraReal || 0);
            return totais;
        }, {
            201: { valorVenda: 0, frete: 0, sobra: 0 },
            203: { valorVenda: 0, frete: 0, sobra: 0 }
        });
    const statusHistoricoCliente = getStatusHistoricoCliente();
    const limiteCreditoRuim = creditoCliente.atingido !== null
        && (creditoCliente.atingido < 0 || creditoCliente.atingido > 100);
    const possuiTitulosVencidos = Number(creditoCliente.titulosVencidos || 0) > 0;
    const statusCreditoCliente = limiteCreditoRuim && possuiTitulosVencidos
        ? { classe: 'cliente-historico-vermelho', texto: 'Limite atingido e títulos vencidos' }
        : limiteCreditoRuim || possuiTitulosVencidos
            ? { classe: 'cliente-historico-amarelo', texto: 'Atenção à situação financeira' }
            : { classe: 'cliente-historico-verde', texto: 'Situação financeira regular' };
    const possuiDadosFinanceiros = prazoMedioVenda !== null
        || Object.values(creditoCliente).some(valor => valor !== null);

    return {
        ...estado,
        buscarClientePorCodigo,
        statusHistoricoCliente,
        formatarDataHistoricoCliente,
        atualizarCliente,
        buscarRepresentantePorCodigo,
        buscarOperacaoPorCodigo,
        atualizarOperacao,
        buscarCondPgtoPorCodigo,
        possuiDadosFinanceiros,
        statusCreditoCliente,
        limiteCreditoRuim,
        possuiTitulosVencidos,
        numeroDecimalBR,
        cobrancaCalculada,
        recalcularItensManualmente,
        importarItensExcel,
        itensAgrupadosOrdenados,
        itemPossuiAcordo,
        itemPossuiPrecoListaBloqueado,
        itemPossuiUltimaCompra,
        itemSemTributacao,
        getDestaqueClassificacao,
        getClasseLinhaItem,
        removerItem,
        selecionarItensPorUnidade,
        calcularValoresItem,
        handleCheckboxChange,
        handleQuantidadeChange,
        validarMultiplo,
        navegarCamposItens,
        handleValorListaChange,
        validarValorListaPromocional,
        handleSobraPercentualChange,
        aplicarSobraPercentual,
        cotar,
        adicionarItem,
        alternarOrdenacaoItens,
        totaisPorUnidade,
        selecionarTransportadora,
        formatarDataUltimaCompraItem,
        getPedidosAcordoTexto,
        getCodigoUnidadeCompra,
        editarObs,
        removerObs,
        salvarObs,
        abrirNovaObs,
        validarOrdemCompra,
        buscarClienteTriangulacaoPorCodigo,
        buscarOperacaoTriangulacaoPorCodigo,
        carregarTiposLogradouro,
        carregarEnderecoPadraoCliente,
        abrirLovEnderecos,
        buscarCepPorCodigo,
        aplicarCep,
        getCodigoPessoaCliente,
        aplicarEnderecoEntrega,
        buscarUfPorCodigo,
        getDescricaoUf,
        limparEnderecoCep,
        buscarCidadePorCodigo,
        carregarUfPorCodigo,
        abrirEmissaoProposta,
        abrirSelecaoUnidadesPedido,
        salvarCotacao,
        novaCotacao,
        navigate,
        location,
        limparTelaPedidoVenda,
        finalizarPedidoErp,
        unidadesComItensSelecionados,
        confirmarEnvioPedidoErp,
        cancelarEnvioPedidoErp,
        emitirProposta
    };
}
