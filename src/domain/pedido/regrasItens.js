import { parametros } from "../../config/parametrosAplicacao";

function valorFlagListaAtiva(valor) {
    return String(valor ?? '').trim() === '1';
}

function listaPrecoEhPromocional(listaPreco) {
    if (!listaPreco) return false;

    return Object.entries(listaPreco).some(([campo, valor]) =>
        campo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'ind_promocao'
        && valorFlagListaAtiva(valor)
    );
}

function listaPrecoEhContrato(listaPreco) {
    return valorFlagListaAtiva(listaPreco?.tip_aplicacao);
}

function itemPossuiAcordo(item) {
    return Boolean(item?.acordosComerciais?.length);
}

function itemPossuiUltimaCompra(item) {
    return Array.isArray(item?.ultimaCompraItemDasUltimasCompras)
        && item.ultimaCompraItemDasUltimasCompras.length > 0;
}

function itemPossuiPrecoListaBloqueado(item) {
    return Boolean(item?.precoListaBloqueado);
}

function itemSemTributacao(item) {
    return Boolean(item?.semTributacao);
}

function getDestaqueClassificacao(item) {
    const classificacao = String(item?.classificacao ?? '').trim().toUpperCase();

    if (parametros.SOBRA_CLASSES_MMT.includes(classificacao)) return '(MMT)';
    if (parametros.SOBRA_CLASSES_AC.includes(classificacao)) return '(AC)';

    return null;
}

function getClasseLinhaItem({ loteProximo, semTributacao, possuiPrecoBloqueado, possuiAcordo, possuiUltimaCompra }) {
    if (semTributacao) return 'item-row-sem-tributacao';
    if (loteProximo) return 'item-row-lote-proximo';
    if (possuiPrecoBloqueado) return 'item-row-preco-bloqueado';
    if (possuiAcordo) return 'item-row-acordo';
    if (possuiUltimaCompra) return 'item-row-ultima-compra';

    return '';
}

function getCodigoUnidadeCompra(compra) {
    return compra?.cod_unidade ?? compra?.codUnidade ?? compra?.cod_empresa ?? compra?.codEmpresa ?? compra?.unidade ?? '-';
}

function getPedidosAcordoTexto(acordos = []) {
    const pedidos = [...new Set(
        acordos
            .map(acordo => acordo.num_pedido)
            .filter(Boolean)
    )];

    if (!pedidos.length) return '-';

    const primeirosPedidos = pedidos.slice(0, 3).join(', ');

    return pedidos.length > 3
        ? `${primeirosPedidos}, ...`
        : primeirosPedidos;
}

function formatarDataUltimaCompraItem(item) {
    return formatarDataHistoricoCliente(item?.ultimaCompraItemDasUltimasCompras?.[0]?.dta_emissao);
}

function formatarDataHistoricoCliente(data) {
    if (!data) return '-';

    const dataCompra = new Date(data);
    if (Number.isNaN(dataCompra.getTime())) return '-';

    return dataCompra.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export { valorFlagListaAtiva, listaPrecoEhPromocional, listaPrecoEhContrato, itemPossuiAcordo, itemPossuiUltimaCompra, itemPossuiPrecoListaBloqueado, itemSemTributacao, getDestaqueClassificacao, getClasseLinhaItem, getCodigoUnidadeCompra, getPedidosAcordoTexto, formatarDataUltimaCompraItem, formatarDataHistoricoCliente };
