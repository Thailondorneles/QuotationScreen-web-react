import { montarContratosDemanda, classificarEfetividade } from './contratos';

export function prepararConsulta(contratos, reservas, hoje = new Date()) {
    const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    return montarContratosDemanda(contratos, reservas, hoje).flatMap(grupo => grupo.itens.map((item, indice) => {
        const inicio = String(item.dta_emissao || '').slice(0, 7);
        const mesesFechados = inicio ? (hoje.getFullYear() - Number(inicio.slice(0, 4))) * 12 + hoje.getMonth() - Number(inicio.slice(5)) + 1 : 0;
        const sugerida = item.media === null ? null : Math.ceil(item.media);
        const desvio = item.media > 0 ? Math.abs((item.reservaMensal - item.media) / item.media) : item.reservaMensal > 0 ? 1 : 0;
        const fim = String(item.dta_carga || '').slice(0, 7);
        const duracao = inicio && fim ? Math.max(1, (Number(fim.slice(0, 4)) - Number(inicio.slice(0, 4))) * 12 + Number(fim.slice(5)) - Number(inicio.slice(5))) : null;
        return { ...item, chave: `${grupo.chave}|${item.cod_item}|${indice}`, unidade: item.cod_unidade == null ? '' : String(item.cod_unidade),
            diasRestantes: item.dta_carga ? Math.round((Date.parse(String(item.dta_carga).slice(0, 10)) - Date.parse(hojeISO)) / 86400000) : null,
            status: classificarEfetividade(item.media, item.efetividade), sugerida,
            ajustar: item.reservaMensal !== null && mesesFechados >= 2 && !item.vencido && desvio > 0.1 + 1e-9 && sugerida !== item.reservaMensal,
            projecao: duracao !== null && item.media !== null ? duracao * item.media : null,
            totalContratado: duracao === null ? null : duracao * item.quantidade };
    })).sort((a, b) => Number(a.num_pedido) - Number(b.num_pedido) || String(a.des_item).localeCompare(String(b.des_item), 'pt-BR'));
}
export function filtrarConsulta(itens, { item = '', pedido = '', unidade = '', status = '' } = {}) {
    const normalizar = valor => String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const busca = normalizar(item.trim());
    return itens.filter(linha => (!busca || String(linha.cod_item).startsWith(busca) || normalizar(linha.des_item).includes(busca))
        && (!pedido || linha.origem === '14' && String(linha.num_pedido) === pedido)
        && (!unidade || linha.unidade === unidade)
        && (!status || (status === 'ajustar' ? linha.ajustar : status === 'vencidos' ? linha.vencido : linha.status.chave === status)));
}
export function resumirConsulta(itens, hoje = new Date()) {
    const iniciados = itens.filter(item => item.media !== null);
    const base = iniciados.reduce((soma, item) => soma + item.quantidade, 0);
    const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const vencimento = itens.map(item => String(item.dta_carga || '').slice(0, 10)).filter(data => data >= hojeISO).sort()[0];
    return { contratos: new Set(itens.filter(item => !item.vencido).map(item => `${item.origem}|${item.num_pedido}`)).size,
        itens: itens.length, quantidade: itens.reduce((soma, item) => soma + item.quantidade, 0),
        consumido: itens.reduce((soma, item) => soma + item.totalConsumido * (Number(item.vlr_uni_bruto) || 0), 0),
        efetividade: base > 0 ? iniciados.reduce((soma, item) => soma + item.media, 0) / base * 100 : null,
        vencimento, dias: vencimento ? Math.round((Date.parse(vencimento) - Date.parse(hojeISO)) / 86400000) : null };
}
