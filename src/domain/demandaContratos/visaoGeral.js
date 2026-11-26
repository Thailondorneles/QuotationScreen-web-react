import { prepararConsulta, resumirConsulta } from './consultaCliente';
import { valorContratadoVigencia } from './contratos';

const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pedidos = itens => new Set(itens.map(item => `${item.cod_cliente}|${item.origem}|${item.num_pedido}`)).size;

function resumirValorContratado(itens) {
    let total = 0;
    let semVigencia = 0;
    itens.forEach(item => {
        const valor = valorContratadoVigencia([item]);
        if (valor === null) semVigencia += 1;
        else total += valor;
    });
    return { contratado: itens.length && semVigencia === itens.length ? null : total, semVigencia };
}

export function montarVisaoGeral(contratos = [], reservas = [], filtros = {}, hoje = new Date()) {
    const todos = prepararConsulta(contratos, reservas, hoje);
    const unidades = [...new Set(todos.map(item => item.unidade).filter(Boolean))].sort();
    const porCliente = new Map();
    todos.filter(item => !filtros.unidade || item.unidade === filtros.unidade).forEach(item => {
        const chave = String(item.cod_cliente);
        if (!porCliente.has(chave)) porCliente.set(chave, []);
        porCliente.get(chave).push(item);
    });
    const busca = normalizar(filtros.busca).trim();
    const linhas = [...porCliente.entries()].flatMap(([codigo, originais]) => {
        const nome = originais.find(item => item.des_pessoa)?.des_pessoa || 'Cliente sem nome informado';
        if (busca && !codigo.startsWith(busca) && !normalizar(nome).includes(busca)) return [];
        const itens = filtros.contratos === 'todos' ? originais : originais.filter(item => !item.vencido);
        if (!itens.length) return [];
        const resumo = resumirConsulta(itens, hoje);
        return [{ codigo, nome, representante: [...new Set(originais.map(item => item.representante).filter(Boolean))].join('; ') || 'Não informado',
            ...resumo, itens, vigentes: pedidos(originais.filter(item => !item.vencido)), vencidos: pedidos(originais.filter(item => item.vencido)),
            quantidadeItens: itens.length, ...resumirValorContratado(itens),
            acima: itens.filter(item => item.status.chave === 'acima').length,
            abaixo: itens.filter(item => item.status.chave === 'abaixo').length,
            semConsumo: itens.filter(item => item.status.chave === 'sem-consumo').length,
            ajustar: itens.filter(item => item.ajustar).length }];
    }).sort((a, b) => b.consumido - a.consumido || a.nome.localeCompare(b.nome, 'pt-BR'));
    const selecionados = linhas.flatMap(linha => linha.itens);
    // O histórico de vencidos permanece no indicador mesmo quando a tabela exibe só vigentes.
    const originaisVisiveis = [...porCliente.entries()].filter(([codigo, itens]) => !busca || codigo.startsWith(busca)
        || normalizar(itens.find(item => item.des_pessoa)?.des_pessoa).includes(busca)).flatMap(([, itens]) => itens);
    return { unidades, linhas, itens: selecionados, resumo: { clientes: linhas.length,
        vigentes: pedidos(originaisVisiveis.filter(item => !item.vencido)), vencidos: pedidos(originaisVisiveis.filter(item => item.vencido)),
        itens: selecionados.length, ...resumirValorContratado(selecionados), ...resumirConsulta(selecionados, hoje) } };
}
