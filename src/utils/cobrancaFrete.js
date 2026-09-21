function numero(valor) {
    const texto = String(valor ?? '');
    const n = Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function calcularSobraComFrete(venda, custoProdutos, impostos, custoFrete, freteCobrado) {
    const sobraReal = venda - custoProdutos - impostos - custoFrete + freteCobrado;
    return { sobraReal, sobraPercentual: venda > 0 ? sobraReal / venda * 100 : 0 };
}

// Distribui centavos sem perder o total informado pelo vendedor.
export function ratearValor(valor, pesos) {
    const total = pesos.reduce((soma, peso) => soma + peso, 0);
    if (!total) return pesos.map(() => 0);
    const centavos = Math.round(numero(valor) * 100);
    let acumulado = 0;
    let anterior = 0;
    return pesos.map(peso => {
        acumulado += peso;
        const atual = Math.round(centavos * acumulado / total);
        const parcela = (atual - anterior) / 100;
        anterior = atual;
        return parcela;
    });
}

export function calcularCobrancaFrete(itens, fretes, opcao, cobranca = { tipo: 'PERCENTUAL', valor: '100' }) {
    const porItem = {};
    const porUnidade = {};
    if (opcao !== 'COBRAR_NF') return { porItem, porUnidade, total: 0 };
    const selecionados = itens.filter(item => item.selecionado);
    const unidades = [...new Set(selecionados.map(item => item.unidade))];
    const custos = unidades.map(unidade => numero(fretes[unidade]?.valor));
    const custoTotal = custos.reduce((soma, custo) => soma + custo, 0);
    const total = cobranca.tipo === 'VALOR' ? numero(cobranca.valor)
        : custoTotal * Math.min(100, numero(cobranca.valor)) / 100;
    const pesosUnidades = custoTotal > 0 ? custos : unidades.map(unidade => selecionados
        .filter(item => item.unidade === unidade)
        .reduce((soma, item) => soma + numero(item.quantidade), 0));
    const parcelas = ratearValor(total, pesosUnidades);
    unidades.forEach((unidade, indice) => {
        porUnidade[unidade] = parcelas[indice];
        const grupo = selecionados.filter(item => item.unidade === unidade);
        let pesos = grupo.map(item => numero(item.valorFrete));
        if (!pesos.some(Boolean)) pesos = grupo.map(item => numero(item.quantidade));
        ratearValor(parcelas[indice], pesos).forEach((valor, i) => { porItem[grupo[i].seq] = valor; });
    });
    return { porItem, porUnidade, total: parcelas.reduce((soma, valor) => soma + valor, 0) };
}
