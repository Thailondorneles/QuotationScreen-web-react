import { getItens, getItensDetalhados } from "../../../services/itens.js";
import { format } from "../../../utils/format.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesItens({
    nextId,
    nextNumItem,
    cliente,
    operacao,
    CondPgto,
    itensPedido,
    buscarDadosItem,
    setFreteSelecionado,
    setItensPedido,
    setOpenLovItens,
    setLoading,
    mapComConcorrencia,
    setModalErro,
    numeroDecimalBR,
    calcularPercentualMaximoSobra,
    calcularValorListaPorSobra,
    itemSemTributacao,
    setMenuSelecaoItensOpen,
    setOrdenacaoItens
}) {
    function criarItensPedido(itemLov) {
        const grupoId = nextId.current;
        const numItem = nextNumItem.current;
        const itemBase = {
            grupoId,
            numItem,
            cod_item: itemLov.cod_item,
            descricao: itemLov.des_item,
            unidadeMedida: itemLov.cod_um ?? '',
            principiosAtivos: itemLov.principios_ativos,
            marca: itemLov.cod_completo,
            qtdMultiplo: Number.isFinite(Number(itemLov.qtd_multiplo)) && Number(itemLov.qtd_multiplo) > 0
                ? Number(itemLov.qtd_multiplo) : 1,
            qtdAltura: null,
            qtdLargura: null,
            qtdComprimento: null,
            qtdM3: null,
            qtdM2: null,
            pesoBruto: null,
            quantidade: itemLov.quantidade ?? '',
            estoque: 0,
            vlrMedio: 0,
            valorLista: 0,
            valorListaOriginal: null,
            codListaPreco: null,
            infoListaPreco: null,
            precoListaPromocional: false,
            valorMinimoLista: null,
            precoListaBloqueado: false,
            semTributacao: false,
            sobraDesejada: null,
            impostos: null,
            baseST: null,
            acordosComerciais: [],

            selecionado: true,
            valorFrete: 0
        };
        // Cria os dois itens (201 e 203)
        const item201 = { ...itemBase, seq: nextId.current, unidade: 201, estoque: itemLov.estoque_matriz };
        const item203 = { ...itemBase, seq: nextId.current + 1, unidade: 203, estoque: itemLov.estoque_filial };
        nextId.current += 2; // avança o contador

        nextNumItem.current += 1;

        return [item201, item203];
    }

    async function importarItensExcel(linhas) {
        if (!cliente?.cod_pessoa || !operacao?.cod_oper || !CondPgto?.cod_cond_pgto) {
            throw new Error('Selecione cliente, operação e condição de pagamento antes de importar.');
        }
        const codigos = [...new Set(linhas.map(linha => linha.codigo))];
        if (itensPedido.some(item => codigos.includes(Number(item.cod_item)))) {
            throw new Error('O arquivo contém produtos já presentes no pedido. Remova essas linhas antes de importar.');
        }
        const response = await getItens();
        const catalogo = new Map((response.data?.items || []).map(item => [Number(item.cod_item), item]));
        for (const linha of linhas) {
            const produto = catalogo.get(linha.codigo);
            if (!produto) throw new Error(`Linha ${linha.linha}: item ${linha.codigo} não encontrado no catálogo.`);
            const multiplo = Number(produto.qtd_multiplo) > 0 ? Number(produto.qtd_multiplo) : 1;
            const razao = linha.quantidade / multiplo;
            if (Math.abs(razao - Math.round(razao)) > 1e-8) {
                throw new Error(`Linha ${linha.linha}: a quantidade deve ser múltipla de ${multiplo}.`);
            }
        }
        // Prepara tudo antes de alterar o pedido; consultas em sequência evitam sobrecarregar as APIs.
        const preparados = [];
        for (const codigo of codigos) {
            const produto = catalogo.get(codigo);
            const detalheResponse = await getItensDetalhados({ codItens: [codigo] });
            const detalhe = detalheResponse.data?.items?.find(item => Number(item.cod_item) === codigo);
            if (!detalhe) throw new Error(`Item ${codigo}: não foi possível obter custos e detalhes.`);
            const pares = criarItensPedido({ ...produto,
                estoque_matriz: produto.qtd_estoque_matriz, estoque_filial: produto.qtd_estoque_filial });
            for (const item of pares) {
                const linha = linhas.find(row => row.codigo === codigo && row.unidade === item.unidade);
                const dados = await buscarDadosItem({ ...item, quantidade: linha?.quantidade ?? item.qtdMultiplo }, { detalheItem: detalhe });
                if (linha) {
                    if (dados.semTributacao) throw new Error(`Linha ${linha.linha}: item sem tributação para a unidade ${item.unidade}.`);
                    if (dados.precoListaBloqueado && Math.abs(linha.valor - dados.valorLista) > 0.00001) {
                        throw new Error(`Linha ${linha.linha}: preço de contrato bloqueado (${dados.valorLista}).`);
                    }
                    if (dados.precoListaPromocional && linha.valor < dados.valorMinimoLista) {
                        throw new Error(`Linha ${linha.linha}: valor inferior ao mínimo promocional (${dados.valorMinimoLista}).`);
                    }
                }
                preparados.push({ ...item, ...dados, selecionado: Boolean(linha),
                    valorLista: linha?.valor ?? dados.valorLista });
            }
        }
        setFreteSelecionado({ 201: null, 203: null });
        setItensPedido(prev => [...prev, ...preparados]);
    }

    async function adicionarItem(itemLov) {
        const itensLov = Array.isArray(itemLov) ? itemLov : [itemLov];
        const novosItens = itensLov.flatMap(criarItensPedido);

        setItensPedido(prev => [...prev, ...novosItens]);
        setOpenLovItens(false);
        setLoading(true);

        // Busca dados completos para cada item e atualiza
        try {
            const responseDetalhes = await getItensDetalhados({
                codItens: itensLov.map(item => item.cod_item)
            });
            const detalhesPorCodigo = new Map(
                (responseDetalhes.data?.items || []).map(item => [String(item.cod_item), item])
            );
            const resultados = await mapComConcorrencia(novosItens, 3, async item => ({
                    seq: item.seq,
                    dados: await buscarDadosItem(item, {
                        detalheItem: detalhesPorCodigo.get(String(item.cod_item))
                    })
                })
            );
            const dadosPorSeq = new Map();
            const erros = [];

            resultados.forEach(resultado => {
                if (resultado.status === 'fulfilled') {
                    dadosPorSeq.set(resultado.value.seq, resultado.value.dados);
                    return;
                }

                erros.push(resultado.reason);
            });

            setItensPedido(prev =>
                prev.filter(item => !novosItens.some(novo => novo.seq === item.seq) || dadosPorSeq.has(item.seq)).map(item =>
                    dadosPorSeq.has(item.seq)
                        ? {
                            ...item,
                            ...dadosPorSeq.get(item.seq),
                            selecionado: dadosPorSeq.get(item.seq).semTributacao ? false : item.selecionado
                        }
                        : item
                )
            );

            if (erros.length) {
                setModalErro({ aberto: true, mensagem: `${erros[0]?.message || 'Não foi possível carregar os dados dos itens.'} Os itens que falharam não foram adicionados.`, seqItem: null, focusSelector: null });
            }
        } catch (error) {
            setItensPedido(prev => prev.filter(item => !novosItens.some(novo => novo.seq === item.seq)));
            setModalErro({ aberto: true, mensagem: 'Não foi possível carregar os dados do item. Verifique a disponibilidade da API e tente adicionar novamente.', seqItem: null, focusSelector: null });
        } finally {
            setLoading(false);
        }
    }

    function removerItem(grupoId) {
        setItensPedido(prev => prev.filter(item => item.grupoId !== grupoId));
    }

    function handleQuantidadeChange(seq, valor) {
        setItensPedido(prev =>
            prev.map(item =>
                item.seq === seq ? { ...item, quantidade: valor } : item
            )
        );
    }

    function navegarCamposItens(event) {
        if (event.key !== 'Enter' && event.key !== 'Tab') return;

        const camposPorUnidade = [201, 203].flatMap(unidade =>
            ['quantidade-unidade', 'valor-lista', 'sobra-percentual'].flatMap(campo =>
                Array.from(document.querySelectorAll(
                    `input[data-field="${campo}"][data-unidade="${unidade}"]:not(:disabled)`
                ))
            )
        );
        const campos = camposPorUnidade.filter(campo => campo.offsetParent !== null);
        const indiceAtual = campos.indexOf(event.currentTarget);
        if (indiceAtual < 0 || !campos.length) return;

        const direcao = event.shiftKey ? -1 : 1;
        let proximoIndice = indiceAtual + direcao;

        if (proximoIndice < 0 || proximoIndice >= campos.length) {
            if (event.key === 'Tab') return;
            proximoIndice = proximoIndice < 0 ? campos.length - 1 : 0;
        }

        const proximoCampo = campos[proximoIndice];
        if (!proximoCampo) {
            return;
        }

        event.preventDefault();
        proximoCampo.focus();
        proximoCampo.select();
    }

    function handleValorListaChange(seq, valor) {
        setItensPedido(prev =>
            prev.map(item =>
                item.seq === seq && !item.precoListaBloqueado
                    ? { ...item, valorLista: valor, sobraDesejada: null }
                    : item
            )
        );
    }

    function validarValorListaPromocional(seq) {
        const item = itensPedido.find(itemAtual => itemAtual.seq === seq);
        if (!item?.precoListaPromocional) return;

        const valorInformado = numeroDecimalBR(item.valorLista);
        const valorMinimo = numeroDecimalBR(item.valorMinimoLista);
        if (Number.isFinite(valorInformado) && valorInformado >= valorMinimo) return;

        setItensPedido(prev => prev.map(itemAtual =>
            itemAtual.seq === seq
                ? { ...itemAtual, valorLista: valorMinimo.toFixed(4), sobraDesejada: null }
                : itemAtual
        ));
        setModalErro({
            aberto: true,
            mensagem: `O preço promocional não pode ser menor que ${format.moeda(valorMinimo)}.`,
            seqItem: null,
            focusSelector: `[data-field="valor-lista"][data-seq="${seq}"]`
        });
    }

    function handleSobraPercentualChange(seq, valor) {
        setItensPedido(prev => prev.map(item =>
            item.seq === seq && !item.precoListaBloqueado ? { ...item, sobraDesejada: valor } : item
        ));
    }

    function aplicarSobraPercentual(item, valor) {
        if (item?.precoListaBloqueado) return;
        // Apenas navegar pelo campo não deve recalcular o preço com a sobra
        // exibida em 2 casas, pois o preço de origem possui até 4 casas.
        if (item?.sobraDesejada === null || item?.sobraDesejada === undefined) return;

        const sobraInformada = Number(String(valor).replace(',', '.'));
        const percentualMaximo = calcularPercentualMaximoSobra(item);

        if (Number.isFinite(sobraInformada) && sobraInformada >= percentualMaximo) {
            setModalErro({
                aberto: true,
                mensagem: `A sobra informada excede o limite deste item. Informe um valor menor que ${percentualMaximo.toFixed(2).replace('.', ',')}%.`,
                seqItem: null,
                focusSelector: null
            });
            return;
        }

        const novoValorLista = calcularValorListaPorSobra(item, valor);
        if (novoValorLista === null || !Number.isFinite(novoValorLista)) return;
        const novoValorListaArredondado = Number(novoValorLista.toFixed(4));
        const valorMinimoLista = numeroDecimalBR(item.valorMinimoLista);

        if (item.precoListaPromocional && novoValorListaArredondado < valorMinimoLista) {
            setModalErro({
                aberto: true,
                mensagem: `O preço promocional não pode ser menor que ${format.moeda(valorMinimoLista)}.`,
                seqItem: null,
                focusSelector: `[data-field="valor-lista"][data-seq="${item.seq}"]`
            });
            return;
        }

        setItensPedido(prev => prev.map(itemAtual => {
            if (itemAtual.seq !== item.seq) return itemAtual;

            return {
                ...itemAtual,
                sobraDesejada: null,
                valorLista: novoValorListaArredondado.toFixed(4)
            };
        }));
    }

    function validarMultiplo(seq) {
        const item = itensPedido.find(i => i.seq === seq);
        if (!item) return;

        const qtd = Number(item.quantidade);
        const multiplo = Number(item.qtdMultiplo);

        if (!qtd || !multiplo) return;

        if (qtd % multiplo !== 0) {
            setModalErro({
                aberto: true,
                mensagem: `Quantidade informada não está de acordo com a quantidade múltipla do item: ${multiplo}.`,
                seqItem: item.seq
            });
            // Limpa a quantidade do item com erro
            handleQuantidadeChange(seq, '');
        }
    }

    function handleCheckboxChange(seq, checked) {
        setItensPedido(prev =>
            prev.map(item =>
                item.seq === seq && !itemSemTributacao(item) ? { ...item, selecionado: checked } : item
            )
        );
    }

    function selecionarItensPorUnidade(unidade, selecionado) {
        setItensPedido(prev =>
            prev.map(item =>
                Number(item.unidade) === Number(unidade)
                    ? { ...item, selecionado: itemSemTributacao(item) ? false : selecionado }
                    : item
            )
        );
        setMenuSelecaoItensOpen(null);
    }

    function alternarOrdenacaoItens(coluna) {
        setOrdenacaoItens(prev => {
            if (prev.coluna !== coluna) {
                return { coluna, direcao: 'asc' };
            }

            if (prev.direcao === 'asc') {
                return { coluna, direcao: 'desc' };
            }

            return { coluna: null, direcao: null };
        });
    }

    return { criarItensPedido, importarItensExcel, adicionarItem, removerItem, handleQuantidadeChange, navegarCamposItens, handleValorListaChange, validarValorListaPromocional, handleSobraPercentualChange, aplicarSobraPercentual, validarMultiplo, handleCheckboxChange, selecionarItensPorUnidade, alternarOrdenacaoItens };
}
