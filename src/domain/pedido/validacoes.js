import { parametros } from "../../config/parametrosAplicacao";
import { dataCargaParaIso } from "../../utils/dataCarga";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarValidacoesPedido({
    dataCargaDigitada,
    itensPedido,
    itemSemTributacao,
    cliente,
    operacao,
    CondPgto,
    codClienteTriangulacaoDigitado,
    codOperacaoTriangulacaoDigitado,
    clienteTriangulacao,
    operacaoTriangulacao,
    ordemCompra
}) {
    function validarPedidoErp() {
        if (dataCargaDigitada && !dataCargaParaIso(dataCargaDigitada)) return { mensagem: 'Informe uma data da carga válida no formato dd/mm/aaaa.' };
        const itensSelecionados = itensPedido.filter(item => item.selecionado);

        if (!itensSelecionados.length) {
            return {
                mensagem: 'Selecione ao menos um item de uma unidade antes de enviar o pedido.'
            };
        }

        const itemSemTributacaoSelecionado = itensSelecionados.find(item => itemSemTributacao(item));

        if (itemSemTributacaoSelecionado) {
            return {
                mensagem: `Item sem tributação: ${itemSemTributacaoSelecionado.cod_item} da unidade ${itemSemTributacaoSelecionado.unidade}. Remova-o da seleção antes de enviar ao ERP.`,
                seqItem: itemSemTributacaoSelecionado.seq
            };
        }

        const itemSemQuantidade = itensSelecionados.find(item => {
            const quantidade = Number(item.quantidade);
            return !Number.isFinite(quantidade) || quantidade <= 0;
        });

        if (itemSemQuantidade) {
            return {
                mensagem: `Informe uma quantidade valida para o item ${itemSemQuantidade.cod_item} da unidade ${itemSemQuantidade.unidade}.`,
                seqItem: itemSemQuantidade.seq
            };
        }

        if (!cliente?.cod_pessoa) {
            return {
                mensagem: 'Selecione um cliente antes de enviar o pedido.'
            };
        }

        if (!operacao?.cod_oper) {
            return {
                mensagem: 'Selecione uma operacao antes de enviar o pedido.'
            };
        }

        if (!CondPgto?.cod_cond_pgto) {
            return {
                mensagem: 'Selecione uma condicao de pagamento antes de enviar o pedido.'
            };
        }

        const possuiDadosTriangulacao = Boolean(
            String(codClienteTriangulacaoDigitado || '').trim()
            || String(codOperacaoTriangulacaoDigitado || '').trim()
            || clienteTriangulacao?.cod_pessoa
            || operacaoTriangulacao?.cod_oper
        );

        if (possuiDadosTriangulacao && !clienteTriangulacao?.cod_pessoa) {
            return {
                mensagem: 'Selecione um cliente de triangulacao valido antes de enviar o pedido.'
            };
        }

        if (possuiDadosTriangulacao && !operacaoTriangulacao?.cod_oper) {
            return {
                mensagem: 'Selecione uma operacao de triangulacao valida antes de enviar o pedido.'
            };
        }

        if (!ordemCompra.trim()) {
            return {
                mensagem: 'Informe a ordem de compra antes de enviar o pedido.',
                focusSelector: 'input[data-field="ordem-compra"]'
            };
        }

        return null;
    }

    function getPercentualMinimoSobraPorClassificacao(desGeral) {
        const classificacao = String(desGeral ?? '').trim().toUpperCase();

        if (parametros.SOBRA_CLASSES_MMT.includes(classificacao)) return parametros.SOBRA_MINIMA_MMT_ITEM;
        if (parametros.SOBRA_CLASSES_AC.includes(classificacao)) return parametros.SOBRA_MINIMA_AC_ITEM;

        return null;
    }

    function getNomeClassificacaoSobra(desGeral) {
        const classificacao = String(desGeral ?? '').trim().toUpperCase();

        if (parametros.SOBRA_CLASSES_MMT.includes(classificacao)) return 'MMT';
        if (parametros.SOBRA_CLASSES_AC.includes(classificacao)) return 'AC';

        return classificacao;
    }

    return { validarPedidoErp, getPercentualMinimoSobraPorClassificacao, getNomeClassificacaoSobra };
}
