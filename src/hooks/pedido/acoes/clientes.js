import { parametros } from "../../../config/parametrosAplicacao";
import { getRepresentantesByCliente, getRepresentantesByIdCliente } from "../../../services/representantes.js";
import { getClienteByFilter, getClienteDetalhado, getClientesHistorico } from "../../../services/clientes.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesClientes({
    cliente,
    codClienteDigitado,
    recalculoClienteId,
    limparEnderecoCep,
    setClienteDetalhado,
    setPrazoMedioVenda,
    setClienteConsumidor,
    setCreditoCliente,
    setFreteSelecionado,
    setUltimasComprasClienteMap,
    setCliente,
    itensPedido,
    setLoading,
    mapComConcorrencia,
    buscarDadosItemComTentativas,
    setItensPedido,
    setModalErro,
    historicoCliente,
    dadosClienteCache,
    representanteClienteCache,
    setLoadingDadosCliente,
    codClienteTriangulacaoDigitado,
    clienteTriangulacao,
    setClienteTriangulacao,
    setCodClienteTriangulacaoDigitado,
    codRepresentanteDigitado,
    setRepresentante,
    historicoClienteCache,
    setHistoricoCliente
}) {
    function getCodigoPessoaCliente() {
        return String(cliente?.cod_pessoa ?? codClienteDigitado ?? '').trim();
    }

    async function atualizarCliente(cli) {
        const codigoAtual = String(cliente?.cod_pessoa ?? '').trim();
        const codigoNovo = String(cli?.cod_pessoa ?? '').trim();
        const mudouCliente = codigoAtual !== codigoNovo;
        const idRecalculo = mudouCliente
            ? ++recalculoClienteId.current
            : recalculoClienteId.current;

        if (mudouCliente) {
            limparEnderecoCep();
            setClienteDetalhado(null);
            setPrazoMedioVenda(null);
            setClienteConsumidor(false);
            setCreditoCliente({ atingido: null, limiteMensal: null, titulosVencidos: null });
            setFreteSelecionado({ 201: null, 203: null });
            setUltimasComprasClienteMap({});
        }

        setCliente(cli);

        if (!mudouCliente || !codigoNovo || !itensPedido.length) {
            if (mudouCliente) setLoading(false);
            return;
        }

        setLoading(true);

        try {
            // Impostos dependem dos padrões comerciais do novo cliente. Sem esta
            // espera, a consulta pode usar operação e condição do cliente anterior.
            const dadosClienteNovo = await buscarDetalhesClientePedido(cli);
            if (idRecalculo !== recalculoClienteId.current) return;

            const operacaoNova = {
                cod_oper: dadosClienteNovo?.cod_oper || null,
                des_oper: dadosClienteNovo?.des_oper || null
            };
            const condPgtoNova = {
                cod_cond_pgto: dadosClienteNovo?.cod_cond_pgto || null,
                des_cond_pgto: dadosClienteNovo?.des_cond_pgto || null
            };

            if (!operacaoNova.cod_oper || !condPgtoNova.cod_cond_pgto) {
                throw new Error('O novo cliente não possui operação ou condição de pagamento padrão para recalcular os itens.');
            }

            const resultados = await mapComConcorrencia(itensPedido, 3, async item => ({
                    seq: item.seq,
                    dados: await buscarDadosItemComTentativas(item, {
                        clienteAtual: cli,
                        operacaoAtual: operacaoNova,
                        condPgtoAtual: condPgtoNova
                    })
                })
            );
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
                            erroRecalculoCliente: false,
                            selecionado: dadosPorSeq.get(item.seq).semTributacao ? false : item.selecionado
                        }
                        : {
                            ...item,
                            valorLista: 0,
                            codListaPreco: null,
                            infoListaPreco: null,
                            valorMinimoLista: null,
                            precoListaPromocional: false,
                            precoListaBloqueado: false,
                            impostos: null,
                            baseST: null,
                            semTributacao: true,
                            selecionado: false,
                            erroRecalculoCliente: true
                        }
                ));
            }

            if (erros.length && idRecalculo === recalculoClienteId.current) {
                const itensComErro = resultados
                    .map((resultado, index) => resultado.status === 'rejected' ? itensPedido[index]?.cod_item : null)
                    .filter(Boolean);
                setModalErro({
                    aberto: true,
                    mensagem: `Não foi possível atualizar a tributação dos itens ${itensComErro.join(', ')}. Eles foram desmarcados para evitar o uso de valores do cliente anterior. Tente novamente.`,
                    seqItem: null,
                    focusSelector: null
                });
            }
        } catch (error) {
            if (idRecalculo !== recalculoClienteId.current) return;
            setItensPedido(prev => prev.map(item => ({
                ...item,
                valorLista: 0,
                impostos: null,
                baseST: null,
                semTributacao: true,
                selecionado: false,
                erroRecalculoCliente: true
            })));
            setModalErro({
                aberto: true,
                mensagem: error?.message || 'Não foi possível carregar os dados comerciais do novo cliente. Os itens foram desmarcados para evitar o uso de valores antigos.',
                seqItem: null,
                focusSelector: null
            });
        } finally {
            if (idRecalculo === recalculoClienteId.current) {
                setLoading(false);
            }
        }
    }

    function getStatusHistoricoCliente() {
        // A validade representa um dia civil, sem converter o horário da API.
        const validade = String(cliente?.dta_validade_alvara ?? '').slice(0, 10);
        const dataValidade = new Date(`${validade}T00:00:00`);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (/^\d{4}-\d{2}-\d{2}$/.test(validade)
            && !Number.isNaN(dataValidade.getTime()) && dataValidade < hoje) {
            return {
                classe: 'cliente-historico-vermelho',
                texto: 'Alvará vencido'
            };
        }

        const dias = Number(historicoCliente.ultimaCompra?.dias_da_ultima_compra);

        if (!historicoCliente.ultimaCompra || Number.isNaN(dias)) {
            return {
                classe: 'cliente-historico-vermelho',
                texto: 'Nunca comprado'
            };
        }

        if (dias <= parametros.CLIENTE_COMPRA_RECENTE_DIAS) {
            return {
                classe: 'cliente-historico-verde',
                texto: 'Compra recente'
            };
        }

        return {
            classe: 'cliente-historico-amarelo',
            texto: 'Compra antiga'
        };
    }

    async function buscarDetalhesClientePedido(cli) {
        const codCliente = String(cli?.cod_pessoa ?? '').trim();

        if (dadosClienteCache.current.has(codCliente)) {
            return dadosClienteCache.current.get(codCliente);
        }

        const requisicao = getClienteDetalhado({ codPessoa: cli.cod_pessoa })
            .then(response => response.data.items?.[0] || cli)
            .then(dadosCliente => {
                dadosClienteCache.current.set(codCliente, dadosCliente);
                return dadosCliente;
            })
            .catch(error => {
                dadosClienteCache.current.delete(codCliente);
                throw error;
            });

        // O recálculo e o preenchimento dos campos compartilham a mesma chamada.
        dadosClienteCache.current.set(codCliente, requisicao);
        return requisicao;
    }

    async function carregarRepresentanteCliente(codCliente) {
        const codigo = String(codCliente ?? '').trim();

        if (representanteClienteCache.current.has(codigo)) {
            return representanteClienteCache.current.get(codigo);
        }

        const response = await getRepresentantesByCliente({
            filtro: codigo,
            offset: 0,
            limit: 1
        });
        const representanteCliente = response.data.items?.[0] || null;

        representanteClienteCache.current.set(codigo, representanteCliente);

        return representanteCliente;
    }

    async function buscarClientePorCodigo() {
        const codigoCliente = String(codClienteDigitado ?? '').trim();

        if (!codigoCliente) {
            setLoadingDadosCliente(false);
            return;
        }

        if (String(cliente?.cod_pessoa ?? '').trim() === codigoCliente) {
            return;
        }

        setLoadingDadosCliente(true);

        try {
            const response = await getClienteByFilter({ filtro: codigoCliente });
            const cli = response.data.items?.[0];

            if (!cli) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Cliente não encontrado com o código digitado!'
                });
                atualizarCliente(null);
                setLoadingDadosCliente(false);
                return;
            }

            atualizarCliente(cli);
        } catch (error) {
            setLoadingDadosCliente(false);
            alert('Erro ao buscar cliente');
        }
    }

    async function buscarClienteTriangulacaoPorCodigo() {
        const codigo = String(codClienteTriangulacaoDigitado ?? '').trim();
        if (!codigo || String(clienteTriangulacao?.cod_pessoa) === codigo) return;
        try {
            const response = await getClienteByFilter({ filtro: codigo });
            const cli = response.data.items?.[0];
            if (!cli) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Cliente de triangulacao nao encontrado!'
                });
                setClienteTriangulacao(null);
                return;
            }
            setClienteTriangulacao(cli);
            setCodClienteTriangulacaoDigitado(cli.cod_pessoa);
        } catch (error) {
            alert('Erro ao buscar cliente de triangulacao');
        }
    }

    async function buscarRepresentantePorCodigo() {
        if (!codRepresentanteDigitado) return;
        try {
            const response = await getRepresentantesByIdCliente({
                representante: codRepresentanteDigitado,
                cliente: codClienteDigitado,
                offset: 0,
                limit: 1
            });
            const rep = response.data.items[0];
            if (!rep) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Representante não encontrado!'
                });
                setRepresentante(null)
                return;
            }

            setRepresentante(rep);
        } catch (error) {
            alert('Erro ao buscar representante');
        }
    }

    async function carregarHistoricoCliente(codCliente) {
        const codigo = String(codCliente ?? '').trim();

        if (historicoClienteCache.current.has(codigo)) {
            setHistoricoCliente({
                loading: false,
                ultimaCompra: historicoClienteCache.current.get(codigo),
                erro: false
            });
            return;
        }

        setHistoricoCliente({
            loading: true,
            ultimaCompra: null,
            erro: false
        });

        try {
            const response = await getClientesHistorico({
                filtro: codCliente,
                offset: 0,
                limit: 1
            });

            const ultimaCompra = response.data.items?.[0] || null;
            historicoClienteCache.current.set(codigo, ultimaCompra);

            setHistoricoCliente({
                loading: false,
                ultimaCompra,
                erro: false
            });
        } catch (error) {
            setHistoricoCliente({
                loading: false,
                ultimaCompra: null,
                erro: true
            });
        }
    }

    return { getCodigoPessoaCliente, atualizarCliente, getStatusHistoricoCliente, buscarDetalhesClientePedido, carregarRepresentanteCliente, buscarClientePorCodigo, buscarClienteTriangulacaoPorCodigo, buscarRepresentantePorCodigo, carregarHistoricoCliente };
}
