import { consultarItensPedido } from '../../../services/itensPedidoWeb';
import { getItens, getItensDetalhados } from '../../../services/itens';
import { mapComConcorrencia } from '../../../utils/mapComConcorrencia';

export async function carregarItensCotacao(pedido, buscarDadosItem, estaAtivo = () => true) {
    let registros = await consultarItensPedido(pedido.numSeqPedido);
    const versoes = new Set(registros.filter(r => r.codVersCotacao != null).map(r => String(r.codVersCotacao)));
    if (versoes.size) {
        if (pedido.codVersCotacao == null && versoes.size > 1) {
            throw new Error('A consulta retornou itens de várias versões sem identificar a versão do cabeçalho.');
        }
        if (pedido.codVersCotacao != null) registros = registros.filter(r => r.codVersCotacao == null || String(r.codVersCotacao) === String(pedido.codVersCotacao));
    }
    if (!registros.length) return [];

    const grupos = new Map();
    for (const registro of registros) {
        const numItem = Number(registro.numItem);
        const unidade = Number(registro.codUnidade);
        if (!Number.isSafeInteger(numItem) || numItem < 1 || ![201, 203].includes(unidade) || !registro.codItem) {
            throw new Error('A consulta retornou um item sem número, unidade ou produto válido.');
        }
        if (registro.numSeqPedido != null && String(registro.numSeqPedido) !== String(pedido.numSeqPedido)) {
            throw new Error('A consulta retornou itens de outra cotação.');
        }
        const grupo = grupos.get(numItem) || new Map();
        if (grupo.has(unidade) || [...grupo.values()].some(r => String(r.codItem) !== String(registro.codItem))) {
            throw new Error(`O item ${numItem} possui registros duplicados ou produtos divergentes entre as unidades.`);
        }
        grupo.set(unidade, registro);
        grupos.set(numItem, grupo);
    }

    const codigos = [...new Set(registros.map(r => String(r.codItem)))];
    const catalogo = new Map();
    const detalhes = new Map();
    await Promise.all([
        (async () => {
            let offset = 0;
            while (codigos.some(codigo => !catalogo.has(codigo))) {
                if (!estaAtivo()) return;
                const { data } = await getItens({ offset, limit: 500 });
                const pagina = Array.isArray(data) ? data : data?.items || [];
                pagina.forEach(item => catalogo.set(String(item.cod_item), item));
                if (!data.hasMore || !pagina.length) break;
                offset += pagina.length;
            }
        })(),
        (async () => {
            const lotes = [];
            for (let i = 0; i < codigos.length; i += 20) {
                lotes.push(codigos.slice(i, i + 20));
            }
            const resultados = await mapComConcorrencia(lotes, 3, async codItens => {
                if (!estaAtivo()) return;
                const { data } = await getItensDetalhados({ codItens });
                (data?.items || []).forEach(item => detalhes.set(String(item.cod_item), item));
            });
            const falha = resultados.find(resultado => resultado.status === 'rejected');
            if (falha) throw falha.reason;
        })()
    ]);
    if (!estaAtivo()) return [];

    const linhas = [...grupos].sort(([a], [b]) => a - b).flatMap(([numItem, grupo], indice) => {
        const primeiro = [...grupo.values()][0];
        const cadastro = catalogo.get(String(primeiro.codItem));
        const detalhe = detalhes.get(String(primeiro.codItem));
        if (!cadastro || !detalhe) throw new Error(`Não foi possível recuperar o cadastro do produto ${primeiro.codItem}. A cotação não será carregada parcialmente.`);
        return [201, 203].map((unidade, indiceUnidade) => ({
            salvo: grupo.get(unidade),
            detalhe,
            item: {
                grupoId: indice * 2 + 1,
                seq: indice * 2 + indiceUnidade + 1,
                numItem,
                unidade,
                cod_item: cadastro.cod_item,
                descricao: cadastro.des_item,
                unidadeMedida: cadastro.cod_um ?? '',
                principiosAtivos: cadastro.principios_ativos,
                marca: cadastro.cod_completo,
                qtdMultiplo: detalhe.qtd_multiplo ?? cadastro.qtd_multiplo ?? 1,
                quantidade: grupo.get(unidade)?.qtdNegociada ?? primeiro.qtdNegociada ?? '',
                selecionado: Number(grupo.get(unidade)?.indSelecionado) === 1,
                valorFrete: 0,
                sobraDesejada: null
            }
        }));
    });

    const resultados = await mapComConcorrencia(linhas, 3, async ({ item, salvo, detalhe }) => {
        if (!estaAtivo()) return null;
        const dados = await buscarDadosItem(item, {
            clienteAtual: { cod_pessoa: pedido.codCliente },
            operacaoAtual: { cod_oper: pedido.codOper },
            condPgtoAtual: { cod_cond_pgto: pedido.codCondPgto },
            detalheItem: detalhe
        });
        return {
            ...item,
            ...dados,
            ...(salvo ? {
                quantidade: salvo.qtdNegociada ?? '',
                valorLista: salvo.vlrUnitario ?? '',
                codListaPreco: salvo.codListaPreco ?? null,
                valorListaOriginal: salvo.vlrListaOriginal ?? null,
                vlrMedio: salvo.vlrCustoCotacao ?? dados.vlrMedio
            } : {}),
            selecionado: item.selecionado
        };
    });
    const falha = resultados.find(r => r.status === 'rejected');
    if (falha) throw new Error(`Não foi possível recalcular os dados dos itens salvos. ${falha.reason?.message || ''}`);
    return resultados.map(r => r.value).filter(Boolean);
}
