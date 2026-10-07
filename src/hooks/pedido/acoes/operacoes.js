import { getCondPgtoByFilter } from "../../../services/condPgto.js";
import { getOperacoesByFilter } from "../../../services/operacoes.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesOperacoes({
    codOperacaoDigitado,
    setModalErro,
    setOperacao,
    operacao,
    cliente,
    itensPedido,
    recalculoClienteId,
    setFreteSelecionado,
    setLoading,
    mapComConcorrencia,
    buscarDadosItem,
    setItensPedido,
    codOperacaoTriangulacaoDigitado,
    operacaoTriangulacao,
    setOperacaoTriangulacao,
    setCodOperacaoTriangulacaoDigitado,
    codCondPgtoDigitado,
    setCondPgto
}) {
    async function buscarOperacaoPorCodigo() {
        if (!codOperacaoDigitado) return;
        try {
            const response = await getOperacoesByFilter({
                filtro: codOperacaoDigitado,
                offset: 0,
                limit: 1
            });
            const oper = response.data.items[0];
            if (!oper) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Operação não encontrada!'
                });
                setOperacao({ cod_oper: null, des_oper: null });
                return;
            }
            await atualizarOperacao(oper);
        } catch (error) {
            alert('Erro ao buscar operação');
        }
    }

    async function atualizarOperacao(novaOperacao) {
        const codigoAtual = String(operacao?.cod_oper ?? '').trim();
        const codigoNovo = String(novaOperacao?.cod_oper ?? '').trim();
        const mudouOperacao = codigoAtual !== codigoNovo;

        setOperacao(novaOperacao);

        if (!mudouOperacao || !codigoNovo || !cliente?.cod_pessoa || !itensPedido.length) {
            return;
        }

        const idRecalculo = ++recalculoClienteId.current;
        setFreteSelecionado({ 201: null, 203: null });
        setLoading(true);

        try {
            const resultados = await mapComConcorrencia(itensPedido, 3, async item => ({
                seq: item.seq,
                dados: await buscarDadosItem(item, { operacaoAtual: novaOperacao })
            }));
            const dadosPorSeq = new Map();
            const erros = [];

            resultados.forEach(resultado => {
                if (resultado.status === 'fulfilled') {
                    dadosPorSeq.set(resultado.value.seq, resultado.value.dados);
                } else {
                    erros.push(resultado.reason);
                }
            });

            if (idRecalculo === recalculoClienteId.current) {
                setItensPedido(prev => prev.map(item =>
                    dadosPorSeq.has(item.seq)
                        ? {
                            ...item,
                            ...dadosPorSeq.get(item.seq),
                            selecionado: dadosPorSeq.get(item.seq).semTributacao ? false : item.selecionado
                        }
                        : item
                ));
            }

            if (erros.length && idRecalculo === recalculoClienteId.current) {
                alert('Erro ao recalcular impostos para alguns itens na nova operação.');
            }
        } finally {
            if (idRecalculo === recalculoClienteId.current) {
                setLoading(false);
            }
        }
    }

    async function buscarOperacaoTriangulacaoPorCodigo() {
        const codigo = String(codOperacaoTriangulacaoDigitado ?? '').trim();
        if (!codigo || String(operacaoTriangulacao?.cod_oper) === codigo) return;
        try {
            const response = await getOperacoesByFilter({
                filtro: codigo,
                offset: 0,
                limit: 1
            });
            const oper = response.data.items[0];
            if (!oper) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Operação da triangulação não encontrada!'
                });
                setOperacaoTriangulacao({ cod_oper: null, des_oper: null });
                return;
            }
            setOperacaoTriangulacao({
                cod_oper: oper.cod_oper,
                des_oper: oper.des_oper
            });
            setCodOperacaoTriangulacaoDigitado(oper.cod_oper);
        } catch (error) {
            alert('Erro ao buscar operação da triangulação');
        }
    }

    async function buscarCondPgtoPorCodigo() {
        if (!codCondPgtoDigitado) return;
        try {
            const response = await getCondPgtoByFilter({
                filtro: codCondPgtoDigitado,
                offset: 0,
                limit: 1
            });
            const cond = response.data.items[0];
            if (!cond) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Condição de Pagamento não encontrado!'
                });
                setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
                return;
            }
            setCondPgto(cond);
        } catch (error) {
            alert('Erro ao buscar condição de pagamento');
        }
    }

    return { buscarOperacaoPorCodigo, atualizarOperacao, buscarOperacaoTriangulacaoPorCodigo, buscarCondPgtoPorCodigo };
}
