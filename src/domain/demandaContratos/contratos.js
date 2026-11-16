export function lerConsumos(texto) {
    const partes = String(texto || '').split(';');
    const meses = {};
    for (let i = 0; i + 1 < partes.length; i += 2) {
        const data = partes[i].trim().match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
        if (!data) continue;
        const quantidade = Number(partes[i + 1].trim().replace(',', '.'));
        if (!Number.isFinite(quantidade)) continue;
        const chave = `${data[2]}-${data[1]}`;
        meses[chave] = (meses[chave] || 0) + quantidade;
    }
    return meses;
}

const chaveMes = data => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
export function classificarEfetividade(media, efetividade, tolerancia = 10) {
    if (media === null) return { chave: 'nao-iniciado', nome: 'Não iniciado' };
    if (media === 0) return { chave: 'sem-consumo', nome: 'Sem consumo' };
    if (efetividade === null) return { chave: 'sem-base', nome: 'Sem base' };
    if (efetividade > 100 + tolerancia) return { chave: 'acima', nome: 'Acima' };
    if (efetividade < 100 - tolerancia) return { chave: 'abaixo', nome: 'Abaixo' };
    return { chave: 'dentro', nome: 'Dentro' };
}

export function valorContratadoVigencia(itens) {
    let total = 0;
    for (const item of itens) {
        if (!item.dta_emissao || !item.dta_carga) return null;
        const inicio = new Date(item.dta_emissao);
        const fim = new Date(item.dta_carga);
        if (!Number.isFinite(+inicio) || !Number.isFinite(+fim) || fim < inicio) return null;
        const meses = Math.max(1, (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + fim.getUTCMonth() - inicio.getUTCMonth());
        total += item.quantidade * meses * (Number(item.vlr_uni_bruto) || 0);
    }
    return total;
}
export function mesesRecentes(hoje = new Date()) {
    return Array.from({ length: 6 }, (_, i) => chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1)));
}

export function analisarItem(item, hoje = new Date()) {
    const consumos = lerConsumos(item.txt_livre1);
    const inicio = String(item.dta_emissao || '').slice(0, 10);
    const fim = String(item.dta_carga || '').slice(0, 10);
    const dataHoje = `${chaveMes(hoje)}-${String(hoje.getDate()).padStart(2, '0')}`;
    const vencido = !!fim && fim < dataHoje;
    const ultimoFechado = chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
    const ultimoConsumo = Object.keys(consumos).filter(mes => consumos[mes] > 0 && mes <= ultimoFechado).sort().pop();
    let referencia = ultimoFechado;
    if (vencido && fim.slice(0, 7) < referencia) referencia = [fim.slice(0, 7), ultimoConsumo || ''].sort().pop();
    const [ano, mes] = referencia.split('-').map(Number);
    const mesesMedia = Array.from({ length: 3 }, (_, i) => chaveMes(new Date(ano, mes - 3 + i, 1)))
        .filter(chave => !inicio || chave >= inicio.slice(0, 7));
    const media = mesesMedia.length ? mesesMedia.reduce((soma, chave) => soma + (consumos[chave] || 0), 0) / mesesMedia.length : null;
    const quantidade = Number(item.qtd_negociada) || 0;
    return { ...item, consumos, vencido, media, quantidade,
        efetividade: quantidade > 0 && media !== null ? media / quantidade * 100 : null,
        totalConsumido: Object.values(consumos).reduce((soma, valor) => soma + valor, 0)
    };
}

export function agruparContratos(itens, hoje = new Date()) {
    const grupos = new Map();
    itens.forEach(item => {
        const chave = String(item.num_pedido);
        if (!grupos.has(chave)) grupos.set(chave, { pedido: item.num_pedido, inicio: item.dta_emissao, fim: item.dta_carga, itens: [] });
        grupos.get(chave).itens.push(analisarItem(item, hoje));
    });
    return [...grupos.values()].sort((a, b) => String(a.fim || '9999').localeCompare(String(b.fim || '9999')));
}

export function resumirContratos(itens, hoje = new Date()) {
    const vigentes = itens.map(item => analisarItem(item, hoje)).filter(item => !item.vencido);
    const iniciados = vigentes.filter(item => item.media !== null);
    const base = iniciados.reduce((soma, item) => soma + item.quantidade, 0);
    const meses = Array.from({ length: 3 }, (_, i) => chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - 3 + i, 1)));
    return {
        contratos: new Set(vigentes.map(item => item.num_pedido)).size,
        itens: vigentes.length,
        contratado: vigentes.reduce((soma, item) => soma + item.quantidade * (Number(item.vlr_uni_bruto) || 0), 0),
        consumo: iniciados.reduce((soma, item) => soma + item.media * (Number(item.vlr_uni_bruto) || 0), 0),
        efetividade: base > 0 ? iniciados.reduce((soma, item) => soma + item.media, 0) / base * 100 : null,
        parados: vigentes.filter(item => String(item.dta_emissao || '').slice(0, 7) && String(item.dta_emissao).slice(0, 7) <= meses[0] && meses.every(mes => !(item.consumos[mes] > 0))).length
    };
}

export function relacionarPedidos(contratos, reservas) {
    const porContrato = new Map();
    reservas.forEach(reserva => {
        const vinculado = String(reserva.num_pedido_vinculado ?? '').trim();
        if (!vinculado || vinculado === '0') return;
        const chave = `${reserva.cod_cliente}|${vinculado}`;
        if (!porContrato.has(chave)) porContrato.set(chave, new Set());
        porContrato.get(chave).add(String(reserva.num_pedido));
    });
    return contratos.map(contrato => {
        const pedidos14 = new Set();
        contrato.itens.forEach(item => {
            const direto = String(item.num_pedido_vinculado ?? '').trim();
            if (direto && direto !== '0') pedidos14.add(direto);
            (porContrato.get(`${item.cod_cliente}|${contrato.pedido}`) || []).forEach(pedido => pedidos14.add(pedido));
        });
        return { ...contrato, pedidos14: [...pedidos14].sort((a, b) => Number(a) - Number(b)),
            itens: contrato.itens.map(item => {
                const vinculadas = reservas.filter(reserva => String(reserva.cod_cliente) === String(item.cod_cliente)
                    && pedidos14.has(String(reserva.num_pedido)) && String(reserva.cod_item) === String(item.cod_item));
                return { ...item, reservaMensal: vinculadas.length ? vinculadas.reduce((soma, reserva) => soma + (Number(reserva.qtd_negociada) || 0), 0) : null };
            })
        };
    });
}

// O relatório 14 define vigência, preço e consumo; o 37 fornece a quantidade original.
export function montarContratosDemanda(contratos37, reservas14, hoje = new Date()) {
    const chave = item => `${item.cod_cliente}|${item.num_pedido}|${item.cod_item}`;
    const indice37 = new Map(contratos37.map(item => [chave(item), item]));
    const usados = new Set();
    const linhas = reservas14.map(reserva => {
        const contrato = indice37.get(`${reserva.cod_cliente}|${reserva.num_pedido_vinculado}|${reserva.cod_item}`);
        if (contrato) usados.add(chave(contrato));
        return { ...reserva, qtd_negociada: contrato ? contrato.qtd_negociada : reserva.qtd_negociada,
            reservaMensal: Number(reserva.qtd_negociada) || 0,
            pedido37: contrato?.num_pedido ?? reserva.num_pedido_vinculado ?? null,
            quantidadeContratada: contrato ? Number(contrato.qtd_negociada) || 0 : null,
            origem: '14'
        };
    });
    contratos37.forEach(contrato => {
        if (!usados.has(chave(contrato))) linhas.push({ ...contrato, pedido37: contrato.num_pedido,
            reservaMensal: null, quantidadeContratada: Number(contrato.qtd_negociada) || 0, origem: '37' });
    });
    const grupos = new Map();
    linhas.forEach(linha => {
        const id = `${linha.cod_cliente}|${linha.origem}|${linha.num_pedido}`;
        if (!grupos.has(id)) grupos.set(id, { chave: id, pedido: linha.num_pedido, inicio: linha.dta_emissao,
            fim: linha.dta_carga, origem: linha.origem, pedidos14: linha.origem === '14' ? [String(linha.num_pedido)] : [], pedidos37: [], itens: [] });
        const grupo = grupos.get(id);
        if (linha.pedido37 != null && !grupo.pedidos37.includes(String(linha.pedido37))) grupo.pedidos37.push(String(linha.pedido37));
        grupo.itens.push(analisarItem(linha, hoje));
    });
    return [...grupos.values()].sort((a, b) => String(a.fim || '9999').localeCompare(String(b.fim || '9999')));
}

export function resumirMarca(itens) {
    const iniciados = itens.filter(item => item.media !== null);
    const base = iniciados.reduce((soma, item) => soma + item.quantidade, 0);
    const media = iniciados.reduce((soma, item) => soma + item.media, 0);
    return {
        itens: new Set(itens.map(item => item.cod_item)).size,
        quantidade: itens.reduce((soma, item) => soma + item.quantidade, 0),
        media,
        efetividade: base > 0 ? media / base * 100 : null,
        contratado: itens.reduce((soma, item) => soma + item.quantidade * (Number(item.vlr_uni_bruto) || 0), 0),
        consumoMedio: iniciados.reduce((soma, item) => soma + item.media * (Number(item.vlr_uni_bruto) || 0), 0),
        consumido: itens.reduce((soma, item) => soma + item.totalConsumido * (Number(item.vlr_uni_bruto) || 0), 0)
    };
}
