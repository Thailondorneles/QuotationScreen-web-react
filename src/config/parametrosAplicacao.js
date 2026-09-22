const padroes = {
    EMPRESA_NOME: 'Unimed Central de Serviços - RS',
    EMPRESA_TELEFONE: '(51) 3462-6400',
    EMPRESA_EMAIL: 'vendas@centralrs.unimed.com.br',
    PROPOSTA_VALIDADE_DIAS: 15,
    PROPOSTA_TITULO: 'PROPOSTA COMERCIAL',
    PROPOSTA_COR_PRINCIPAL: '#2e8b1c',
    SOBRA_MINIMA_MMT_ITEM: 6,
    SOBRA_MINIMA_AC_ITEM: 4,
    SOBRA_MINIMA_TOTAL_AC: 4,
    SOBRA_MINIMA_TOTAL_GERAL: 6,
    SOBRA_CLASSES_MMT: ['T', 'I'],
    SOBRA_CLASSES_AC: ['A', 'B'],
    CLIENTE_COMPRA_RECENTE_DIAS: 45,
    HISTORICO_COMPRAS_POR_ITEM: 5,
    AMBIENTE_COR_PRINCIPAL: '#2e8b1c',
    AMBIENTE_LOGO: '',
    PROPOSTA_LOGO: ''
};

export const parametros = { ...padroes };

export function validarParametros(items) {
    const resultado = { ...padroes };
    for (const item of Array.isArray(items) ? items : []) {
        const chave = String(item.des_conf ?? '').trim().toUpperCase();
        if (!Object.prototype.hasOwnProperty.call(padroes, chave)) continue;
        const valor = String(item.parametro ?? '').trim();
        if (!valor) continue;
        if (chave.endsWith('_COR_PRINCIPAL')) {
            if (/^#[0-9a-f]{6}$/i.test(valor)) resultado[chave] = valor.toUpperCase();
        } else if (chave.endsWith('_LOGO')) {
            if (/^\/imagens\/[a-z0-9_/-]+\.png$/i.test(valor)) resultado[chave] = valor;
        } else if (Array.isArray(padroes[chave])) {
            const classes = valor.toUpperCase().split(',').map(v => v.trim()).filter(Boolean);
            if (classes.length && classes.every(v => /^[A-Z0-9]+$/.test(v))) resultado[chave] = [...new Set(classes)];
        } else if (typeof padroes[chave] === 'number') {
            const numero = Number(valor.replace(',', '.'));
            const percentual = chave.startsWith('SOBRA_MINIMA_');
            const minimo = chave === 'HISTORICO_COMPRAS_POR_ITEM' ? 1 : 0;
            const maximo = percentual || chave === 'HISTORICO_COMPRAS_POR_ITEM' ? 100 : 36500;
            if (Number.isFinite(numero) && numero >= minimo && numero <= maximo && (percentual || Number.isInteger(numero))) resultado[chave] = numero;
        } else {
            resultado[chave] = valor;
        }
    }
    if (resultado.SOBRA_CLASSES_AC.some(classe => resultado.SOBRA_CLASSES_MMT.includes(classe))) {
        resultado.SOBRA_CLASSES_AC = padroes.SOBRA_CLASSES_AC;
        resultado.SOBRA_CLASSES_MMT = padroes.SOBRA_CLASSES_MMT;
    }
    return resultado;
}

export function aplicarParametros(items) {
    Object.assign(parametros, validarParametros(items));
    const cor = parametros.AMBIENTE_COR_PRINCIPAL;
    const rgb = [1, 3, 5].map(inicio => parseInt(cor.slice(inicio, inicio + 2), 16));
    const misturar = (alvo, peso) => `rgb(${rgb.map(canal => Math.round(canal * (1 - peso) + alvo * peso)).join(',')})`;
    const tema = {
        '--ambiente-cor': cor,
        '--ambiente-escura': misturar(0, 0.25),
        '--ambiente-clara': misturar(255, 0.88),
        '--ambiente-hover': misturar(255, 0.75),
        '--ambiente-borda': misturar(255, 0.6)
    };
    Object.entries(tema).forEach(([nome, valor]) => document.documentElement.style.setProperty(nome, valor));
}
