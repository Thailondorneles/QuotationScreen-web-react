function dataAtualErp() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();

    return `${dia}/${mes}/${ano}`;
}

function apenasNumeros(valor) {
    return String(valor ?? '').replace(/\D/g, '');
}

function limparCamposVazios(valor) {
    if (Array.isArray(valor)) {
        return valor
            .map(limparCamposVazios)
            .filter(item => item !== null && item !== undefined);
    }

    if (valor && typeof valor === 'object') {
        return Object.entries(valor).reduce((acc, [chave, item]) => {
            const itemLimpo = limparCamposVazios(item);

            if (itemLimpo === null || itemLimpo === undefined || itemLimpo === '') {
                return acc;
            }

            if (Array.isArray(itemLimpo) && itemLimpo.length === 0) {
                return acc;
            }

            acc[chave] = itemLimpo;
            return acc;
        }, {});
    }

    return valor;
}

function numeroDecimalBR(valor) {
    const texto = String(valor ?? '').trim();
    const normalizado = texto.includes(',')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto;
    const numero = Number(normalizado);

    return Number.isFinite(numero) ? numero : 0;
}

function valorDecimalErp(valor) {
    return numeroDecimalBR(valor).toFixed(4).replace('.', ',');
}

export { dataAtualErp, apenasNumeros, limparCamposVazios, numeroDecimalBR, valorDecimalErp };
