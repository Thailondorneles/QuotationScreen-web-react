// Compara entradas do usuário, sem incluir loading, modais ou respostas de integração.
export function assinaturaCotacao(estado) {
    const campos = [
        'cliente', 'representante', 'operacao', 'CondPgto', 'clienteConsumidor',
        'modalidadeIntegracao', 'opcaoFrete', 'cobrancaFrete', 'ordemCompra',
        'clienteTriangulacao', 'operacaoTriangulacao', 'dataCargaDigitada',
        'freteSelecionado', 'observacoes', 'uf', 'cidade', 'codCepDigitado',
        'logradouroDigitado', 'bairroDigitado', 'numeroEnderecoDigitado',
        'complementoEnderecoDigitado', 'referenciaEnderecoDigitado', 'tipoLogradouroSelecionado',
        'codClienteDigitado', 'codRepresentanteDigitado', 'codOperacaoDigitado',
        'codCondPgtoDigitado', 'codClienteTriangulacaoDigitado', 'codOperacaoTriangulacaoDigitado',
        'codUfDigitado', 'codCidadeDigitado'
    ];
    return JSON.stringify({
        campos: campos.map(campo => estado[campo]),
        itens: estado.itensPedido.map(item => {
            const { seq, groupId, numItem, unidade, cod_item, selecionado, quantidade,
                valorLista, valorListaOriginal, vlrMedio, codListaPreco } = item;
            return { seq, groupId, numItem, unidade, cod_item, selecionado, quantidade,
                valorLista, valorListaOriginal, vlrMedio, codListaPreco };
        })
    });
}
