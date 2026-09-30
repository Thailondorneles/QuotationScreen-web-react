import { parametros } from "../../../config/parametrosAplicacao";
import { getItensClassificacao } from "../../../services/itens.js";
import { enviarPedidoErp, consultarPedidosPorSequencia } from "../../../services/pedidosErp.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesIntegracao({
    obterItensSelecionadosPorUnidades,
    calcularValoresItem,
    getPercentualMinimoSobraPorClassificacao,
    modalidadeIntegracao,
    getNomeClassificacaoSobra,
    validarPedidoErp,
    setModalErro,
    setOpenLovUnidadesPedido,
    operacaoPersistencia,
    setLoading,
    persistirCabecalho,
    montarPayloadsPedidoErp,
    cabecalhoSalvo,
    setModalSucesso,
    setModalConfirmacaoErp,
    modalConfirmacaoErp
}) {
    async function avaliarSituacoesPedidoErp(unidadesSelecionadas = [201, 203]) {
        const itensSelecionados = obterItensSelecionadosPorUnidades(unidadesSelecionadas);
        const codItens = itensSelecionados.map(item => item.cod_item);

        if (!codItens.length) return { situacoesPorUnidade: {}, mensagens: [] };

        const response = await getItensClassificacao({ codItens });
        const classificacoesPorItem = (response.data.items || []).reduce((acc, item) => {
            acc[String(item.cod_item)] = item.des_geral;
            return acc;
        }, {});
        const situacoesPorUnidade = {};
        const mensagens = [];

        unidadesSelecionadas.map(Number).forEach(unidade => {
            const itensUnidade = itensSelecionados.filter(item => Number(item.unidade) === unidade);
            if (!itensUnidade.length) return;

            const totais = itensUnidade.reduce((acc, item) => {
                const valores = calcularValoresItem(item);
                acc.valorVenda += Number(valores.valorVendaTotal || 0);
                acc.sobra += Number(valores.sobraReal || 0);
                return acc;
            }, { valorVenda: 0, sobra: 0 });
            const sobraTotal = Number((totais.valorVenda > 0
                ? (totais.sobra / totais.valorVenda) * 100
                : 0).toFixed(2));
            const somenteAC = itensUnidade.every(item => parametros.SOBRA_CLASSES_AC.includes(
                String(classificacoesPorItem[String(item.cod_item)] ?? '').trim().toUpperCase()
            ));
            const minimoSobraTotal = somenteAC
                ? parametros.SOBRA_MINIMA_TOTAL_AC
                : parametros.SOBRA_MINIMA_TOTAL_GERAL;
            const itensForaRegra = itensUnidade.reduce((erros, item) => {
                if (item.precoListaBloqueado) return erros;

                const classificacao = classificacoesPorItem[String(item.cod_item)];
                const minimoSobra = getPercentualMinimoSobraPorClassificacao(classificacao);
                if (minimoSobra === null) return erros;

                const sobraPercentual = Number(Number(
                    calcularValoresItem(item).sobraPercentual || 0
                ).toFixed(2));
                if (sobraPercentual < minimoSobra) {
                    erros.push({ item, classificacao, minimoSobra, sobraPercentual });
                }
                return erros;
            }, []);

            const requerAprovacao = sobraTotal < minimoSobraTotal || itensForaRegra.length > 0;
            situacoesPorUnidade[unidade] = requerAprovacao
                ? 70
                : modalidadeIntegracao === 7 ? 32 : 6;

            if (sobraTotal < minimoSobraTotal) {
                mensagens.push(
                    `UNIDADE ${unidade}\n` +
                    `Sobra total: ${sobraTotal.toFixed(2).replace('.', ',')}% (mínima: ${minimoSobraTotal}%)\n` +
                    'A sobra total está abaixo da mínima. O pedido irá para aprovação no NL em situação 70.'
                );
            } else if (itensForaRegra.length) {
                const detalhes = itensForaRegra.map(({ item, classificacao, minimoSobra, sobraPercentual }) =>
                    `• Item seq. ${item.seq} - ${item.cod_item} (${getNomeClassificacaoSobra(classificacao)}) — ` +
                    `sobra ${sobraPercentual.toFixed(2).replace('.', ',')}% < mínima ${minimoSobra}%`
                ).join('\n');
                mensagens.push(
                    `UNIDADE ${unidade}\n` +
                    `Sobra total: ${sobraTotal.toFixed(2).replace('.', ',')}% (mínima atingida)\n\n` +
                    `Itens abaixo da sobra exigida:\n${detalhes}\n\n` +
                    'O pedido irá para aprovação no NL em situação 70.'
                );
            }
        });

        return { situacoesPorUnidade, mensagens };
    }

    function abrirSelecaoUnidadesPedido() {
        const erroValidacao = validarPedidoErp();

        if (erroValidacao) {
            setModalErro({ aberto: true, ...erroValidacao });
            return;
        }

        setOpenLovUnidadesPedido(true);
    }

    function exibirErroEnvioPedidoErp(error) {
        const erroBackend = error?.response?.data;
        const detalheErro = erroBackend?.detalhe
            ? JSON.stringify(erroBackend.detalhe)
            : error.message;
        const etapaErro = erroBackend?.etapa ? ` Etapa: ${erroBackend.etapa}.` : '';
        const sequenciaErro = erroBackend?.numSeq ? ` Sequência de integração: ${erroBackend.numSeq}.` : '';

        setModalErro({
            aberto: true,
            seqItem: error?.seqItem || null,
            mensagem: erroBackend
                ? `${erroBackend.erro}.${etapaErro}${sequenciaErro} Detalhe: ${detalheErro}`
                : error.mensagem || error.message || 'Erro ao integrar pedido com o ERP.'
        });
    }

    async function enviarPedidosAoErp(unidadesSelecionadas, situacoesPorUnidade) {
        if (operacaoPersistencia.current) return;
        operacaoPersistencia.current = true;
        try {
            setLoading(true);
            const numSeqPedido = await persistirCabecalho();
            const payloads = montarPayloadsPedidoErp(unidadesSelecionadas, situacoesPorUnidade);

            const resultados = await Promise.allSettled(payloads.map(payload => enviarPedidoErp({ ...payload, numSeqPedido })));
            const pedidosConsultados = await consultarPedidosPorSequencia(numSeqPedido);
            const consultas = payloads.map(payload => pedidosConsultados.filter(pedido => Number(pedido.cod_unidade) === Number(payload.pePedidos.codUnidade)));
            const anterior = cabecalhoSalvo.current;
            const matriz = pedidosConsultados.find(p => Number(p.cod_unidade) === 201)?.num_pedido ?? anterior.numPedidoMatriz;
            const filial = pedidosConsultados.find(p => Number(p.cod_unidade) === 203)?.num_pedido ?? anterior.numPedidoFilial;
            const unidadesConfirmadas = new Set([
                ...(matriz != null ? [201] : []), ...(filial != null ? [203] : []),
                ...resultados.filter(r => r.status === 'fulfilled').flatMap(r => r.value.data.unidadesIntegradas || []),
                ...payloads.filter((_, index) => resultados[index].status === 'fulfilled').map(p => Number(p.pePedidos.codUnidade))
            ]);
            await persistirCabecalho({ numPedidoMatriz: matriz, numPedidoFilial: filial, statusCotacao: Math.max(Number(anterior.statusCotacao), unidadesConfirmadas.size) });
            const falhas = resultados.filter(resultado => resultado.status === 'rejected');
            if (falhas.length) throw new Error(`Falha em ${falhas.length} envio(s). Confira os pedidos integrados antes de repetir. ${falhas.map(f => f.reason.response?.data?.erro || f.reason.message).join(' ')}`);
            const detalhes = consultas.flatMap((pedidos, index) => pedidos.length
                ? pedidos.map(pedido =>
                    `Unidade ${pedido.cod_unidade} — Pedido ${pedido.num_pedido} — Complemento ${pedido.cod_compl}`
                )
                : [`Unidade ${payloads[index].pePedidos.codUnidade} — Pedido gerado; dados ainda indisponíveis para consulta.`]
            );
            const mensagem = payloads.length === 1
                ? 'O pedido foi gerado no ERP com sucesso.'
                : 'Os pedidos foram gerados no ERP com sucesso.';

            setModalSucesso({
                aberto: true,
                mensagem: `${mensagem}\n\n${detalhes.join('\n')}`,
                limparAoFechar: false
            });
        } catch (error) {
            exibirErroEnvioPedidoErp(error);
        } finally {
            operacaoPersistencia.current = false;
            setLoading(false);
        }
    }

    async function finalizarPedidoErp(unidadesSelecionadas) {
        try {
            setOpenLovUnidadesPedido(false);
            setLoading(true);

            const avaliacao = await avaliarSituacoesPedidoErp(unidadesSelecionadas);

            if (avaliacao.mensagens.length) {
                setModalConfirmacaoErp({
                    aberto: true,
                    mensagem: `${avaliacao.mensagens.join('\n\n')}\n\nDeseja prosseguir?`,
                    unidadesSelecionadas,
                    situacoesPorUnidade: avaliacao.situacoesPorUnidade
                });
                return;
            }

            await enviarPedidosAoErp(unidadesSelecionadas, avaliacao.situacoesPorUnidade);
        } catch (error) {
            exibirErroEnvioPedidoErp(error);
        } finally {
            setLoading(false);
        }
    }

    function cancelarEnvioPedidoErp() {
        setModalConfirmacaoErp({
            aberto: false,
            mensagem: '',
            unidadesSelecionadas: [],
            situacoesPorUnidade: {}
        });
    }

    function confirmarEnvioPedidoErp() {
        const { unidadesSelecionadas, situacoesPorUnidade } = modalConfirmacaoErp;
        cancelarEnvioPedidoErp();
        enviarPedidosAoErp(unidadesSelecionadas, situacoesPorUnidade);
    }

    return { avaliarSituacoesPedidoErp, abrirSelecaoUnidadesPedido, exibirErroEnvioPedidoErp, enviarPedidosAoErp, finalizarPedidoErp, cancelarEnvioPedidoErp, confirmarEnvioPedidoErp };
}
