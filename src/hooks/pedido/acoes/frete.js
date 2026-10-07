import { cotarSimFrete } from "../../../config/simFreteService.js";
import { ratearValor } from "../../../utils/cobrancaFrete.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesFrete({
    setLoading,
    itensPedido,
    setFreteSelecionado,
    setModalErro,
    temEnderecoEntrega,
    cliente,
    clienteDetalhado,
    apenasNumeros,
    codCidadeDigitado,
    clienteTriangulacao,
    buscarDetalhesClientePedido,
    setCotacoesFrete,
    setItensPedido,
    freteSelecionado
}) {
    async function cotar() {
        setLoading(true);
        try {
            const itensSelecionados = itensPedido.filter(item => item.selecionado);

            setFreteSelecionado({ 201: null, 203: null });
            aplicarRateioFrete({});

            if (itensSelecionados.length === 0) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Selecione pelo menos um item para cotar o frete.'
                });
                return;
            }

            const itensInvalidos = itensSelecionados.some(i =>
                !i.unidade || !i.quantidade || Number(i.quantidade) <= 0
            );

            if (itensInvalidos) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Todos os itens selecionados devem possuir quantidade válida'
                });
                return;
            }

            let clienteDestino;

            if (temEnderecoEntrega()) {
                clienteDestino = {
                    ...cliente,
                    ...clienteDetalhado,
                    cod_cidade: apenasNumeros(codCidadeDigitado)
                };
            } else if (clienteTriangulacao) {
                const clienteTriangulacaoDetalhado = await buscarDetalhesClientePedido(clienteTriangulacao);
                clienteDestino = {
                    ...clienteTriangulacao,
                    ...clienteTriangulacaoDetalhado
                };
            } else {
                clienteDestino = {
                    ...cliente,
                    ...clienteDetalhado
                };
            }

            const retorno = await cotarSimFrete(itensSelecionados, clienteDestino);

            const selecaoAuto = {};
            const unidadesSemCotacao = [];
            const cotacoesMap = {};

            retorno.forEach(r => {
                const lista = Array.isArray(r.transportadoras) ? r.transportadoras : [];
                cotacoesMap[r.unidade] = lista;

                const primeiraTransportadora = lista[0];

                if (primeiraTransportadora) {
                    selecaoAuto[r.unidade] = primeiraTransportadora;
                    return;
                }

                unidadesSemCotacao.push(r.unidade);
            });

            if (unidadesSemCotacao.length) {
                setModalErro({
                    aberto: true,
                    mensagem: `Nenhuma transportadora retornada para a(s) unidade(s): ${unidadesSemCotacao.join(', ')}.`
                });
                return;
            }

            setCotacoesFrete(prev => ({ ...prev, ...cotacoesMap }));
            setFreteSelecionado(selecaoAuto);
            aplicarRateioFrete(selecaoAuto);
        } catch (err) {
            alert(err.message || 'Erro ao cotar frete');
        } finally {
            setLoading(false);
        }
    }

    function aplicarRateioFrete(selecionados) {
        const FATOR_CUBAGEM = 300; // 1 m³ = 300 kg
        setItensPedido(prev => {
            let novosItens = prev.map(item => ({ ...item, valorFrete: 0 }));

            Object.entries(selecionados).forEach(([unidade, frete]) => {

                if (!frete) return;
                const valorFrete = Number(frete.valor);
                if (isNaN(valorFrete) || valorFrete <= 0) {
                    return;
                }

                const indicesItensUnidade = [];
                novosItens.forEach((item, index) => {
                    if (Number(item.unidade) === Number(unidade) && item.selecionado) {
                        indicesItensUnidade.push(index);
                    }
                });

                if (indicesItensUnidade.length === 0) {
                    return;
                }

                const pesosCobranca = indicesItensUnidade.map(index => {
                    const item = novosItens[index];
                    const qtd = Number(item.quantidade) || 0;
                    const pesoReal = (Number(item.pesoBruto) || 0) * qtd;
                    const volumeTotal = (Number(item.qtdM3) || 0) * qtd;
                    const pesoCubado = volumeTotal * FATOR_CUBAGEM;
                    const peso = Math.max(pesoReal, pesoCubado);
                    return peso;
                });

                const totalPesoCobranca = pesosCobranca.reduce((soma, peso) => soma + peso, 0);

                if (totalPesoCobranca === 0) {
                    const quantidades = indicesItensUnidade.map(index => Number(novosItens[index].quantidade) || 0);
                    const totalQuantidade = quantidades.reduce((soma, q) => soma + q, 0);
                    if (totalQuantidade === 0) {
                        return;
                    }
                    const parcelas = ratearValor(valorFrete, quantidades);
                    indicesItensUnidade.forEach((itemIndex, i) => { novosItens[itemIndex].valorFrete = parcelas[i]; });
                } else {
                    const parcelas = ratearValor(valorFrete, pesosCobranca);
                    indicesItensUnidade.forEach((itemIndex, i) => { novosItens[itemIndex].valorFrete = parcelas[i]; });
                }
            });

            return novosItens;
        });
    }

    function selecionarTransportadora(unidade, transporte) {
        if (!unidade) return;
        const novaSelecao = { ...freteSelecionado, [unidade]: transporte };
        setFreteSelecionado(novaSelecao);
        aplicarRateioFrete(novaSelecao);
    }

    return { cotar, aplicarRateioFrete, selecionarTransportadora };
}
