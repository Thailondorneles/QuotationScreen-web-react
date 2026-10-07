export function montarEnderecoPersistencia(dados, getCodigoTipoLogradouro) {
    const texto = valor => String(valor ?? '').trim() || null;
    const codCidade = texto(dados.codCidadeDigitado);
    const tipo = texto(dados.tipoLogradouroSelecionado);
    const codigoTipo = tipo ? getCodigoTipoLogradouro(tipo) : null;
    if (tipo && codigoTipo == null) {
        throw new Error('Selecione um tipo de logradouro válido antes de salvar o endereço.');
    }
    if (codCidade && (!Number.isSafeInteger(Number(codCidade)) || Number(codCidade) <= 0)) {
        throw new Error('Informe um código de cidade válido antes de salvar o endereço.');
    }
    return {
        numCep: texto(String(dados.codCepDigitado ?? '').replace(/\D/g, '')),
        codUf: texto(dados.codUfDigitado),
        codCidade: codCidade ? Number(codCidade) : null,
        codTipLogradouro: codigoTipo == null ? null : Number(codigoTipo),
        desLogradouro: texto(dados.logradouroDigitado),
        numLogradouro: texto(dados.numeroEnderecoDigitado),
        desComplLogradouro: texto(dados.complementoEnderecoDigitado),
        desBairro: texto(dados.bairroDigitado),
        desReferencia: texto(dados.referenciaEnderecoDigitado)
    };
}
