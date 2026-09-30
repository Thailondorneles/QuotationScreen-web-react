import { invalidarConsultas } from "../../../services/consultaCache";
import { getImpostosCached, invalidarImpostos } from "../../../services/impostos.js";
import { getListaPreco } from "../../../services/listaPreco.js";
import { getItensAcordos } from "../../../services/itens.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesPrecificacao({
    itensPedido,
    setModalErro,
    cliente,
    operacao,
    CondPgto,
    recalculoClienteId,
    listaPrecoInfoCache,
    setFreteSelecionado,
    setLoading,
    mapComConcorrencia,
    setItensPedido,
    setModalSucesso,
    listaPrecoEhPromocional,
    listaPrecoEhContrato,
    ultimasComprasClienteMap,
    getCodigoPessoaCliente
}) {
    async function recalcularItensManualmente() {
        if (!itensPedido.length) {
            setModalErro({ aberto: true, mensagem: 'Não há itens para recalcular.', seqItem: null, focusSelector: null });
            return;
        }
        if (!cliente?.cod_pessoa || !operacao?.cod_oper || !CondPgto?.cod_cond_pgto) {
            setModalErro({
                aberto: true,
                mensagem: 'Informe cliente, operação e condição de pagamento antes de recalcular os itens.',
                seqItem: null,
                focusSelector: null
            });
            return;
        }

        const idRecalculo = ++recalculoClienteId.current;
        const itensAtuais = itensPedido;
        invalidarImpostos();
        invalidarConsultas('acordos|');
        listaPrecoInfoCache.current.clear();
        setFreteSelecionado({ 201: null, 203: null });
        setLoading(true);

        try {
            const resultados = await mapComConcorrencia(itensAtuais, 3, async item => ({
                seq: item.seq,
                dados: await buscarDadosItemComTentativas(item, {
                    clienteAtual: cliente,
                    operacaoAtual: operacao,
                    condPgtoAtual: CondPgto
                })
            }));
            if (idRecalculo !== recalculoClienteId.current) return;

            const dadosPorSeq = new Map();
            resultados.forEach(resultado => {
                if (resultado.status === 'fulfilled') {
                    dadosPorSeq.set(resultado.value.seq, resultado.value.dados);
                }
            });

            setItensPedido(prev => prev.map(item => dadosPorSeq.has(item.seq)
                ? {
                    ...item,
                    ...dadosPorSeq.get(item.seq),
                    erroRecalculoCliente: false,
                    selecionado: dadosPorSeq.get(item.seq).semTributacao ? false : item.selecionado
                }
                : {
                    ...item,
                    valorLista: 0,
                    codListaPreco: null,
                    infoListaPreco: null,
                    valorMinimoLista: null,
                    precoListaPromocional: false,
                    precoListaBloqueado: false,
                    impostos: null,
                    baseST: null,
                    semTributacao: true,
                    selecionado: false,
                    erroRecalculoCliente: true
                }
            ));

            const itensComErro = resultados
                .map((resultado, index) => resultado.status === 'rejected' ? itensAtuais[index]?.cod_item : null)
                .filter(Boolean);

            if (itensComErro.length) {
                setModalErro({
                    aberto: true,
                    mensagem: `Não foi possível recalcular os itens ${itensComErro.join(', ')}. Eles permaneceram desmarcados e sem valores antigos.`,
                    seqItem: null,
                    focusSelector: null
                });
            } else {
                setModalSucesso({
                    aberto: true,
                    mensagem: 'Itens recalculados com sucesso.',
                    limparAoFechar: false
                });
            }
        } finally {
            if (idRecalculo === recalculoClienteId.current) setLoading(false);
        }
    }

    async function carregarInfoListaPreco(codLista, codItem) {
        const lista = String(codLista ?? '').trim();
        const item = String(codItem ?? '').trim();

        if (!lista || !item) return null;

        const chave = `${lista}-${item}`;
        if (listaPrecoInfoCache.current.has(chave)) {
            return await listaPrecoInfoCache.current.get(chave);
        }

        const promise = getListaPreco({ lista, item })
            .then(response => response.data?.items?.[0] || null)
            .catch(error => {
                listaPrecoInfoCache.current.delete(chave);
                throw new Error(`Não foi possível consultar a lista de preços ${lista} do item ${item}. Tente novamente quando a API estiver disponível.`);
            });

        listaPrecoInfoCache.current.set(chave, promise);

        const infoLista = await promise;
        listaPrecoInfoCache.current.set(chave, infoLista);

        return infoLista;
    }

    async function buscarDadosItem(item, contexto = {}) {
        const clienteAtual = contexto.clienteAtual ?? cliente;
        const operacaoAtual = contexto.operacaoAtual ?? operacao;
        const condPgtoAtual = contexto.condPgtoAtual ?? CondPgto;
        // Busca estoque disponível
        const detalheItem = contexto.detalheItem || {};
        const [respImp, acordosComerciais] = await Promise.all([
            getImpostosCached({
                codOper: operacaoAtual.cod_oper,
                codUnidade: item.unidade,
                codPessoa: clienteAtual.cod_pessoa,
                codCondPgto: condPgtoAtual.cod_cond_pgto,
                codItem: item.cod_item
            }),
            carregarAcordosItem(item.cod_item, clienteAtual.cod_pessoa)
        ]);
        const unidadeMatriz = Number(item.unidade) === 201;
        const estoque = unidadeMatriz
            ? (detalheItem.qtd_estoque_matriz ?? item.estoque ?? 0)
            : (detalheItem.qtd_estoque_filial ?? item.estoque ?? 0);
        const vlrMedio = unidadeMatriz
            ? (detalheItem.vlr_medio_unitario_matriz ?? item.vlrMedio ?? 0)
            : (detalheItem.vlr_medio_unitario_filial ?? item.vlrMedio ?? 0);
        // Busca impostos
        const imp = respImp.data || {};
        // O ERP sempre informa num_seq_busca quando encontrou tributacao, inclusive
        // quando seu valor e 0. Nulo/ausente identifica item sem tributacao.
        const semTributacao = imp.num_seq_busca == null;
        const indSubsMercadoria = Number(imp.ind_subs_mercadoria || 0);
        const valorLista = Number(imp.vlr_item || 0);
        const codListaPreco = imp.cod_lista ?? null;
        const infoListaPreco = codListaPreco
            ? await carregarInfoListaPreco(codListaPreco, item.cod_item)
            : null;
        const precoListaPromocional = listaPrecoEhPromocional(infoListaPreco);
        const precoListaBloqueado = listaPrecoEhContrato(infoListaPreco);

        const perSubstTribOriginal = Number(imp.per_subst_trib || 0);
        const possuiDifal = indSubsMercadoria === 1
            && imp.txt_refaz_bc_st?.toUpperCase().includes('DIF');
        const perDifal = possuiDifal
            ? perSubstTribOriginal - Number(imp.per_icms || 0)
            : 0;

        const impostos = {
            perIcms: imp.per_icms,
            perPis: imp.per_aliq_pis,
            perCofins: imp.per_aliq_cofins,
            perIpi: imp.per_ipi,
            perFcp: imp.per_fcp,
            perSubstTrib: indSubsMercadoria === 1 && !possuiDifal ? perSubstTribOriginal : 0,
            perDifal: indSubsMercadoria === 1 ? perDifal : 0,
            difal: indSubsMercadoria === 1 ? imp.txt_refaz_bc_st : null,
            idxSubsTrib: indSubsMercadoria === 1 ? imp.idx_subs_trib : null,
            listaST: indSubsMercadoria === 1 ? imp.cod_lista_st : null,
            // percentual de ICMS desonerado / Funrural — NÃO deve reduzir a sobra
            perFunrural: Number(imp.per_funrural || 0),
            indIcmsFreteSoma: Number(imp.ind_icms_frete_soma || 0),
            indIcmsIpiSoma: Number(imp.ind_icms_ipi_soma || 0),
            indIcmsCofinsSoma: Number(imp.ind_icms_cofins_soma || 0),
            indIcmsPisSoma: Number(imp.ind_icms_pis_soma || 0),
            indSubsFreteSoma: Number(imp.ind_subs_frete_soma || 0),
            indSubsIpiSoma: Number(imp.ind_subs_ipi_soma || 0),
            indSubsCofinsSoma: Number(imp.ind_subs_cofins_soma || 0),
            indSubsPisSoma: Number(imp.ind_subs_pis_soma || 0),
            indIpiFreteSoma: Number(imp.ind_ipi_frete_soma || 0),
            indPiscofFreteSoma: Number(imp.ind_piscof_frete_soma || 0),
            indPiscofIpiSoma: Number(imp.ind_piscof_ipi_soma || 0),
            indPiscofIcmsAbate: Number(imp.ind_piscof_icms_abate || 0),
            indSubsMercadoria,
            codListaPreco
        };

        // Base de ST se houver lista
        let baseST = null;
        if (impostos.indSubsMercadoria === 1 && impostos.listaST) {
            const listaST = await carregarInfoListaPreco(impostos.listaST, item.cod_item);
            const vlrListaST = listaST?.vlr_item;
            baseST = Number(vlrListaST ?? valorLista ?? 0);
        }

        const qtdMultiplo = item.qtdMultiplo ?? detalheItem.qtd_multiplo;
        const quantidade = item.quantidade !== '' && item.quantidade !== null && item.quantidade !== undefined
            ? item.quantidade
            : Number(qtdMultiplo) > 0 ? qtdMultiplo : 1;

        return {
            estoque,
            vlrMedio,
            quantidade,
            ticktMedio: detalheItem.ticket_medio ?? item.ticktMedio ?? null,
            qtdMultiplo,
            qtdAltura: detalheItem.qtd_altura ?? item.qtdAltura,
            qtdLargura: detalheItem.qtd_largura ?? item.qtdLargura,
            qtdComprimento: detalheItem.qtd_comprimento ?? item.qtdComprimento,
            qtdM3: detalheItem.qtd_m3 ?? item.qtdM3,
            qtdM2: detalheItem.qtd_m2 ?? item.qtdM2,
            pesoBruto: detalheItem.qtd_peso_bruto ?? item.pesoBruto,
            valorLista,
            codListaPreco,
            infoListaPreco,
            precoListaPromocional,
            valorMinimoLista: precoListaPromocional ? valorLista : null,
            precoListaBloqueado,
            semTributacao,
            impostos,
            baseST,
            acordosComerciais,
            ultimaCompraItemDasUltimasCompras: ultimasComprasClienteMap[item.cod_item] || null
        };
    }

    async function buscarDadosItemComTentativas(item, contexto, totalTentativas = 2) {
        let ultimoErro;

        for (let tentativa = 1; tentativa <= totalTentativas; tentativa += 1) {
            try {
                return await buscarDadosItem(item, contexto);
            } catch (error) {
                ultimoErro = error;
            }
        }

        throw ultimoErro;
    }

    async function carregarAcordosItem(codItem, codCliente = getCodigoPessoaCliente()) {
        const codigo = String(codItem ?? '').trim();
        const codigoCliente = String(codCliente ?? '').trim();
        return getItensAcordos({
            codItem: codigo,
            codCliente: codigoCliente,
            offset: 0,
            limit: 25
        })
            .then(response => response.data.items || [])
            .catch(() => []);

    }

    return { recalcularItensManualmente, carregarInfoListaPreco, buscarDadosItem, buscarDadosItemComTentativas, carregarAcordosItem };
}
