import { dataCargaParaIso } from "../../utils/dataCarga";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarMapeadoresPedido({
    codCepDigitado,
    logradouroDigitado,
    bairroDigitado,
    numeroEnderecoDigitado,
    complementoEnderecoDigitado,
    referenciaEnderecoDigitado,
    tipoLogradouroSelecionado,
    observacoes,
    limparCamposVazios,
    getCodigoTipoLogradouro,
    apenasNumeros,
    codCidadeDigitado,
    dataAtualErp,
    dataCargaDigitada,
    codClienteTriangulacaoDigitado,
    clienteTriangulacao,
    codOperacaoTriangulacaoDigitado,
    operacaoTriangulacao,
    modalidadeIntegracao,
    ordemCompra,
    valorDecimalErp,
    cobrancaCalculada,
    CondPgto,
    operacao,
    clienteDetalhado,
    cliente,
    representante,
    getUsuarioIntegracao,
    validarPedidoErp,
    itensPedido,
    freteSelecionado,
    opcaoFrete,
    cobrancaFrete,
    codUfDigitado,
    cidade
}) {
    function temEnderecoEntrega() {
        return Boolean(
            codCepDigitado ||
            logradouroDigitado ||
            bairroDigitado ||
            numeroEnderecoDigitado ||
            complementoEnderecoDigitado ||
            referenciaEnderecoDigitado ||
            tipoLogradouroSelecionado
        );
    }

    function montarPeObservacoes() {
        const observacoesMarcadas = observacoes.filter(obs =>
            obs.pedido || obs.nota || obs.registro || obs.financeiro
        );

        if (!observacoesMarcadas.length) {
            return null;
        }

        return observacoesMarcadas.map((obs, index) => ({
            txtObs: obs.descricao || '-',
            indPedido: obs.pedido ? 1 : 0,
            indNf: obs.nota ? 1 : 0,
            indRegistro: obs.registro ? 1 : 0,
            indCr: obs.financeiro ? 1 : 0,
            numSeq: index < 98 ? index + 1 : index + 2,
            tipTransacao: 1
        }));
    }

    function montarPeEndEntrega(unidadePedido, dataTransacao) {
        if (!temEnderecoEntrega()) {
            return null;
        }

        const endereco = [tipoLogradouroSelecionado, logradouroDigitado].filter(Boolean).join(' ');

        return limparCamposVazios({
            codEmp: '01',
            codUnidade: unidadePedido,
            codCompl: 0,
            desEndereco: endereco || logradouroDigitado,
            desLogradouro: logradouroDigitado,
            codLogradouro: getCodigoTipoLogradouro(tipoLogradouroSelecionado),
            desBairro: bairroDigitado,
            codCidade: apenasNumeros(codCidadeDigitado)
                ? Number(apenasNumeros(codCidadeDigitado))
                : null,
            numCep: Number(apenasNumeros(codCepDigitado)),
            numLogradouro: Number(apenasNumeros(numeroEnderecoDigitado) || 0),
            dtaTransacao: dataTransacao,
            tipTransacao: 1
        });
    }

    function montarPayloadPedidoErpPorUnidade(unidadePedido, itensUnidade, codSituacao = 6) {
        const dataErp = dataAtualErp();
        const dataTransacao = dataCargaParaIso(dataCargaDigitada) || dataErp;
        const peObservacoes = montarPeObservacoes();
        const peEndEntrega = montarPeEndEntrega(unidadePedido, dataTransacao);
        const codClienteRemessa = String(
            codClienteTriangulacaoDigitado || clienteTriangulacao?.cod_pessoa || ''
        ).trim();
        const codOperRemessa = String(
            codOperacaoTriangulacaoDigitado || operacaoTriangulacao?.cod_oper || ''
        ).trim();

        const pePedidos = {
            codEmp: '01',
            codUnidade: unidadePedido,
            numPedido: '-1',
            numSeqConf: modalidadeIntegracao,
            codCompl: 0,
            desNumOcCliente: ordemCompra || null,
            codSituacao,
            dtaEmissao: dataErp,
            dtaDigitacao: dataErp,
            tipFrete: 1,
            vlrFrete: valorDecimalErp(itensUnidade.reduce((total, item) => total + (cobrancaCalculada.porItem[item.seq] || 0), 0)),
            codCondPgto: String(CondPgto.cod_cond_pgto),
            codOper: String(operacao.cod_oper),
            codOperRemessa: codOperRemessa || null,
            indConsumidor: Number(clienteDetalhado?.ind_consumidor) === 1 ? 1 : 0,
            codCliente: String(cliente.cod_pessoa),
            codClienteRemessa: codClienteRemessa || null,
            codRepresentante: representante?.cod_pessoa_rep ? String(representante.cod_pessoa_rep) : null,
            tipTransacao: 1,
            peItens: itensUnidade.map(item => ({
                codItem: String(item.cod_item),
                codLista: item.codListaPreco != null ? String(item.codListaPreco) : null,
                codReserva: 7,
                qtdNegociada: Number(item.quantidade),
                vlrUniBruto: valorDecimalErp(item.valorLista),
                codUnidadeRetira: unidadePedido,
                tipTransacao: 1,
                qtdReservada: Number(item.quantidade),
                indVlrAlterado: 0,
                numItem: item.numItem
            }))
        };

        if (peObservacoes) {
            pePedidos.peObservacoes = peObservacoes;
        }

        if (peEndEntrega) {
            pePedidos.peEndEntrega = peEndEntrega;
        }

        return limparCamposVazios({
            codEmp: '01',
            codMaquina: 1,
            usuario: getUsuarioIntegracao() || null,
            pePedidos
        });
    }

    function montarPayloadsPedidoErp(unidadesSelecionadas = [201, 203], situacoesPorUnidade = {}) {
        const erroValidacao = validarPedidoErp();

        if (erroValidacao) {
            throw erroValidacao;
        }

        const unidades = unidadesSelecionadas.map(Number);

        if (!unidades.length) {
            throw { mensagem: 'Selecione ao menos uma unidade para gerar o pedido.' };
        }

        const gruposSelecionados = unidades
            .map(unidade => ({
                unidade,
                itens: obterItensSelecionadosPorUnidades([unidade])
            }))
            .filter(grupo => grupo.itens.length);

        if (!gruposSelecionados.length) {
            throw { mensagem: 'As unidades escolhidas não possuem itens marcados para integração.' };
        }

        return gruposSelecionados.map(grupo =>
            montarPayloadPedidoErpPorUnidade(
                grupo.unidade,
                grupo.itens,
                situacoesPorUnidade[grupo.unidade] ?? 6
            )
        );
    }

    function obterDadosPropostaTela() {
        return {
            cliente,
            clienteDetalhado,
            representante,
            condicaoPagamento: CondPgto,
            ordemCompra,
            dataCarga: dataCargaParaIso(dataCargaDigitada) || '',
            observacoes,
            itensPedido,
            freteSelecionado,
            opcaoFrete,
            cobrancaFrete,
            endereco: {
                cep: codCepDigitado,
                uf: codUfDigitado,
                cidade: cidade?.des_cidade || '',
                tipoLogradouro: tipoLogradouroSelecionado,
                logradouro: logradouroDigitado,
                numero: numeroEnderecoDigitado,
                complemento: complementoEnderecoDigitado,
                bairro: bairroDigitado,
                referencia: referenciaEnderecoDigitado
            }
        };
    }

    function obterItensSelecionadosPorUnidades(unidadesSelecionadas = [201, 203]) {
        const unidades = unidadesSelecionadas.map(Number);

        return itensPedido.filter(item =>
            item.selecionado && unidades.includes(Number(item.unidade))
        );
    }

    return { temEnderecoEntrega, montarPeObservacoes, montarPeEndEntrega, montarPayloadPedidoErpPorUnidade, montarPayloadsPedidoErp, obterDadosPropostaTela, obterItensSelecionadosPorUnidades };
}
