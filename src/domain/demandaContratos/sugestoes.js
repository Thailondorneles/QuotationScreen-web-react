import { classificarEfetividade } from './contratos';

const iso = data => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
export function periodoVisita(hoje = new Date()) {
    return { inicio: iso(new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1)), fim: iso(hoje), meses: 7 };
}

export function montarSugestoes(vendas, itensContratos, periodo) {
    const vigentes = itensContratos.filter(item => !item.vencido);
    const codigos = new Set(vigentes.map(item => String(item.cod_item)));
    const grupos = new Map();
    vendas.forEach(venda => {
        const dia = String(venda.dta_emissao || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia < periodo.inicio || dia > periodo.fim) return;
        const quantidade = Number(venda.quantidade);
        const valor = Number(venda.vlr_total);
        if (!Number.isFinite(quantidade) || !Number.isFinite(valor) || venda.cod_item == null) return;
        const codigo = String(venda.cod_item);
        if (!grupos.has(codigo)) grupos.set(codigo, { codigo, descricao: venda.des_item, marca: venda.marca,
            quantidade: 0, valor: 0, meses: new Set(), ultimaData: '', ultimaQuantidade: 0, ultimoValor: 0, teveVenda: false });
        const item = grupos.get(codigo);
        item.quantidade += quantidade; item.valor += valor;
        if (quantidade > 0 && valor > 0) {
            item.teveVenda = true; item.meses.add(dia.slice(0, 7));
            if (dia > item.ultimaData) { item.ultimaData = dia; item.ultimaQuantidade = 0; item.ultimoValor = 0; }
            if (dia === item.ultimaData) { item.ultimaQuantidade += quantidade; item.ultimoValor += valor; }
        }
    });
    const itens = [...grupos.values()].map(item => ({ ...item, emContrato: codigos.has(item.codigo),
        media: item.quantidade / periodo.meses,
        ultimoPreco: item.ultimaQuantidade > 0 ? item.ultimoValor / item.ultimaQuantidade : null
    }));
    const fora = itens.filter(item => !item.emContrato && item.teveVenda).sort((a, b) => b.valor - a.valor);
    const acima = vigentes.filter(item => item.media !== null && item.quantidade > 0
        && classificarEfetividade(item.media, item.media / item.quantidade * 100).chave === 'acima')
        .map(item => ({ ...item, venda: grupos.get(String(item.cod_item)), excedente: (item.media - item.quantidade) * (Number(item.vlr_uni_bruto) || 0) }))
        .sort((a, b) => b.excedente - a.excedente);
    const total = itens.reduce((soma, item) => soma + item.valor, 0);
    const emContrato = itens.filter(item => item.emContrato).reduce((soma, item) => soma + item.valor, 0);
    return { fora, acima, total, emContrato, foraContrato: total - emContrato };
}
