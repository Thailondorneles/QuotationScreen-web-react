import { parametros } from "../../../config/parametrosAplicacao";
import { getItensClassificacao } from "../../../services/itens.js";
import { enviarPedidoErp, consultarPedidosPorSequencia, consultarPedidosExistentes } from "../../../services/pedidosErp.js";
import { salvarIntegracaoPedido, consultarPedido } from "../../../services/pedidosWeb";

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
    persistirPedido,
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
            const numSeqPedido = await persistirPedido();
            const payloads = montarPayloadsPedidoErp(unidadesSelecionadas, situacoesPorUnidade);

            const pedidosAnteriores = await consultarPedidosExistentes(numSeqPedido);
            const resultados = await Promise.allSettled(payloads.map(payload => enviarPedidoErp({ ...payload, numSeqPedido })));
            // Descarta os pedidos que j? existiam antes deste envio.
            const consultas = await Promise.all(resultados.map(async (resultado, index) => {
                if (resultado.status !== 'fulfilled') return [];
                const retorno = resultado.value.data;
                const unidade = Number(payloads[index].pePedidos.codUnidade);
                if (retorno.jaIntegrado) {
                    let numeroPedido = retorno.numeroPedido;
                    if (numeroPedido == null) {
                        const salvo = await consultarPedido(numSeqPedido);
                        numeroPedido = unidade === 201 ? salvo.numPedidoMatriz : salvo.numPedidoFilial;
                    }
                    if (!/^\d+\/\d+$/.test(String(numeroPedido))) {
                        console.error('[Integracao ERP] Retorno sem numero/complemento valido:', { unidade, retorno, numeroPedido });
                        throw new Error(`A unidade ${unidade} foi indicada como já integrada, mas não retornou um número/complemento válido. Confira o pedido no NL e reinicie o backend com o código atualizado antes de tentar novamente.`);
                    }
                    const [numero, complemento] = String(numeroPedido).split('/');
                    return [{ cod_unidade: unidade, num_pedido: numero, cod_compl: complemento }];
                }
                return consultarPedidosPorSequencia(numSeqPedido, [unidade], pedidosAnteriores);
            }));
            const pedidosConsultados = consultas.flat();
            if (pedidosConsultados.some(pedido => !/^\d+\/\d+$/.test(`${pedido.num_pedido}/${pedido.cod_compl}`))) {
                throw new Error('O retorno do NL contém número/complemento inválido. A atualização da integração não foi enviada.');
            }
            const anterior = cabecalhoSalvo.current || {};
            const numeroCompleto = unidade => {
                const pedido = pedidosConsultados.find(p => Number(p.cod_unidade) === unidade);
                return pedido ? `${pedido.num_pedido}/${pedido.cod_compl}` : null;
            };
            const integracao = {
                numSeqPedido,
                numPedidoMatriz: numeroCompleto(201) ?? anterior.numPedidoMatriz ?? null,
                numPedidoFilial: numeroCompleto(203) ?? anterior.numPedidoFilial ?? null
            };
            if (pedidosConsultados.length) {
                await salvarIntegracaoPedido(integracao);
                cabecalhoSalvo.current = { ...anterior, ...integracao, statusCotacao: 1 };
            }
            const falhas = resultados.filter(resultado => resultado.status === 'rejected');
            if (falhas.length) throw new Error(`Falha em ${falhas.length} envio(s). Confira os pedidos integrados antes de repetir. ${falhas.map(f => f.reason.response?.data?.erro || f.reason.message).join(' ')}`);
            if (consultas.some(pedidos => !pedidos.length)) {
                throw new Error('O envio ao NL foi confirmado, mas o número/complemento de alguma unidade ainda não está disponível. A integração dessa unidade não foi registrada na cotação. Confira os pedidos no NL antes de repetir o envio.');
            }
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
