import '../style/pedidoVenda.css';
import { FaCalendarAlt, FaEdit, FaEraser, FaSearch, FaTrash } from "react-icons/fa";
import { useState, useEffect, useRef } from 'react';
import { LovItens } from '../components/LovItens.js';
import { LovClientes } from '../components/LovClientes.js';
import { LovRepresentantes } from '../components/LovRepresentantes.js';
import { LovOperacoes } from '../components/LovOperacoes.js';
import { LovCondPgto } from '../components/LovCondPgto.js';
import { LovCidades } from '../components/LovCidades.js';
import { LovUf } from '../components/LovUf.js';
import { LovCep } from '../components/LovCep.js';
import { LovEnderecos } from '../components/LovEnderecos.js';
import { getCepsByFilter } from '../services/ceps.js';
import { getEnderecosPadraoByFilter } from '../services/enderecosPadrao.js';
import { getRepresentantesByCliente, getRepresentantesByIdCliente } from '../services/representantes.js';
import { getClienteByFilter, getClientesComentarios, getClientesHistorico } from '../services/clientes.js';
import { getCidadesByFilter } from '../services/cidades.js';
import { getUfByFilter } from '../services/uf.js';
import { getTipLogradouro } from '../services/tipLogradouro.js';
import { getCondPgtoByFilter } from '../services/condPgto.js';
import { getOperacoesByFilter } from '../services/operacoes.js';
import { IoInformationOutline } from "react-icons/io5";
import { getImpostos } from '../services/impostos.js';
import { ModalErro } from '../components/ModalErro.js';
import { getListaPreco } from '../services/listaPreco.js';
import { getItensAcordos, getItensDetalhados, getItemUltimaCompra } from '../services/itens.js';
import { cotarSimFrete } from '../config/simFreteService.js';
import { format } from '../utils/format.js';
import { maskMoneyBR } from '../utils/maskMoney.js';
import LoadingOverlay from '../components/LoadingOverlay.js';
import { LovObservacao } from '../components/LovObservacao.js';
import { enviarPedidoErp } from '../services/pedidosErp.js';
import { LovUnidadesPedido } from '../components/LovUnidadesPedido.js';


export function PedidoVenda() {
    const [openLovItens, setOpenLovItens] = useState(false);
    const [openLovPessoas, setOpenLovPessoas] = useState(false);
    const [openLovTriangulacao, setOpenLovTriangulacao] = useState(false);
    const [openLovRepresentantes, setOpenLovRepresentantes] = useState(false);
    const [openLovOperacoes, setOpenLovOperacoes] = useState(false);
    const [openLovOperacoesTriangulacao, setOpenLovOperacoesTriangulacao] = useState(false);
    const [openLovCondPgto, setOpenLovCondPgto] = useState(false);
    const [openLovCidades, setOpenLovCidades] = useState(false);
    const [openLovUf, setOpenLovUf] = useState(false);
    const [openLovCep, setOpenLovCep] = useState(false);
    const [openLovEnderecos, setOpenLovEnderecos] = useState(false);
    const [cliente, setCliente] = useState(null);
    const [clienteTriangulacao, setClienteTriangulacao] = useState(null);
    const [representante, setRepresentante] = useState(null);
    const [operacao, setOperacao] = useState({ cod_oper: null, des_oper: null });
    const [uf, setUf] = useState(null);
    const [cidade, setCidade] = useState(null);
    const [operacaoTriangulacao, setOperacaoTriangulacao] = useState({ cod_oper: null, des_oper: null });
    const [CondPgto, setCondPgto] = useState({ cod_cond_pgto: null, des_cond_pgto: null });
    const [prazoMedioVenda, setPrazoMedioVenda] = useState(null);
    const [creditoCliente, setCreditoCliente] = useState({
        atingido: null,
        limiteMensal: null,
        titulosVencidos: null
    });
    const [codClienteDigitado, setCodClienteDigitado] = useState('');
    const [codClienteTriangulacaoDigitado, setCodClienteTriangulacaoDigitado] = useState('');
    const [codRepresentanteDigitado, setCodRepresentanteDigitado] = useState('');
    const [codOperacaoDigitado, setCodOperacaoDigitado] = useState('');
    const [codOperacaoTriangulacaoDigitado, setCodOperacaoTriangulacaoDigitado] = useState('');
    const [codCondPgtoDigitado, setCodCondPgtoDigitado] = useState('');
    const [codUfDigitado, setCodUfDigitado] = useState('');
    const [codCidadeDigitado, setCodCidadeDigitado] = useState('');
    const [codCepDigitado, setCodCepDigitado] = useState('');
    const [logradouroDigitado, setLogradouroDigitado] = useState('');
    const [bairroDigitado, setBairroDigitado] = useState('');
    const [numeroEnderecoDigitado, setNumeroEnderecoDigitado] = useState('');
    const [complementoEnderecoDigitado, setComplementoEnderecoDigitado] = useState('');
    const [referenciaEnderecoDigitado, setReferenciaEnderecoDigitado] = useState('');
    const [dataCargaDigitada, setDataCargaDigitada] = useState('');
    const [tiposLogradouro, setTiposLogradouro] = useState([]);
    const [tipoLogradouroSelecionado, setTipoLogradouroSelecionado] = useState('');
    const [itensPedido, setItensPedido] = useState([]);
    const [modalErro, setModalErro] = useState({
        aberto: false,
        mensagem: '',
        seqItem: null,
        focusSelector: null
    });
    const [modalSucesso, setModalSucesso] = useState({
        aberto: false,
        mensagem: ''
    });
    const nextId = useRef(1);
    const [freteSelecionado, setFreteSelecionado] = useState({
        201: null,
        203: null
    });
    const [loading, setLoading] = useState(false);
    const [loadingDadosCliente, setLoadingDadosCliente] = useState(false);
    const [observacoes, setObservacoes] = useState([]);
    const [historicoCliente, setHistoricoCliente] = useState({
        loading: false,
        ultimaCompra: null,
        erro: false
    });
    const [openObsModal, setOpenObsModal] = useState(false);
    const [obsEditando, setObsEditando] = useState(null);
    const [ordemCompra, setOrdemCompra] = useState('');
    const [menuSelecaoItensOpen, setMenuSelecaoItensOpen] = useState(null);
    const [openLovUnidadesPedido, setOpenLovUnidadesPedido] = useState(false);
    const dadosClienteCache = useRef(new Map());
    const representanteClienteCache = useRef(new Map());
    const historicoClienteCache = useRef(new Map());
    const acordosItemCache = useRef(new Map());
    const ultimaCompraItemCache = useRef(new Map());
    const recalculoClienteId = useRef(0);

    function validarOrdemCompra() {
        const possuiCaracterEspecial = /[\|/]/.test(ordemCompra);

        if (!possuiCaracterEspecial) return;

        setModalErro({
            aberto: true,
            mensagem: 'A ordem de compra nao pode conter caracteres especiais como | ou /',
            seqItem: null,
            focusSelector: 'input[data-field="ordem-compra"]'
        });
    }

    function getDescricaoUf(item) {
        return item?.des_uf || '';
    }

    function getDescricaoTipoLogradouro(codTipo) {
        const tipo = tiposLogradouro.find(item => String(item.cod_tipo) === String(codTipo));
        return tipo?.des_tipo || '';
    }

    function getCodigoPessoaCliente() {
        return String(cliente?.cod_pessoa ?? codClienteDigitado ?? '').trim();
    }

    function limparCidadeUf() {
        setCidade(null);
        setCodCidadeDigitado('');
        setUf(null);
        setCodUfDigitado('');
    }

    function limparEnderecoCep() {
        setCodCepDigitado('');
        setLogradouroDigitado('');
        setBairroDigitado('');
        setNumeroEnderecoDigitado('');
        setComplementoEnderecoDigitado('');
        setReferenciaEnderecoDigitado('');
        setDataCargaDigitada('');
        setTipoLogradouroSelecionado('');
        setOpenLovEnderecos(false);
        limparCidadeUf();
    }

    function limparTelaPedidoVenda() {
        setOpenLovItens(false);
        setOpenLovPessoas(false);
        setOpenLovTriangulacao(false);
        setOpenLovRepresentantes(false);
        setOpenLovOperacoes(false);
        setOpenLovOperacoesTriangulacao(false);
        setOpenLovCondPgto(false);
        setOpenLovCidades(false);
        setOpenLovUf(false);
        setOpenLovCep(false);
        setOpenLovEnderecos(false);
        setCliente(null);
        setClienteTriangulacao(null);
        setRepresentante(null);
        setOperacao({ cod_oper: null, des_oper: null });
        setOperacaoTriangulacao({ cod_oper: null, des_oper: null });
        setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
        setPrazoMedioVenda(null);
        setCreditoCliente({ atingido: null, limiteMensal: null, titulosVencidos: null });
        setCodClienteDigitado('');
        setCodClienteTriangulacaoDigitado('');
        setCodRepresentanteDigitado('');
        setCodOperacaoDigitado('');
        setCodOperacaoTriangulacaoDigitado('');
        setCodCondPgtoDigitado('');
        setItensPedido([]);
        setFreteSelecionado({ 201: null, 203: null });
        setObservacoes([]);
        setHistoricoCliente({ loading: false, ultimaCompra: null, erro: false });
        setLoadingDadosCliente(false);
        setOpenObsModal(false);
        setObsEditando(null);
        setOrdemCompra('');
        setMenuSelecaoItensOpen(null);
        setModalErro({
            aberto: false,
            mensagem: '',
            seqItem: null,
            focusSelector: null
        });
        setModalSucesso({
            aberto: false,
            mensagem: ''
        });
        nextId.current = 1;
        limparEnderecoCep();
    }

    async function atualizarCliente(cli) {
        const codigoAtual = String(cliente?.cod_pessoa ?? '').trim();
        const codigoNovo = String(cli?.cod_pessoa ?? '').trim();
        const mudouCliente = codigoAtual !== codigoNovo;
        const idRecalculo = mudouCliente
            ? ++recalculoClienteId.current
            : recalculoClienteId.current;

        if (mudouCliente) {
            limparEnderecoCep();
            setPrazoMedioVenda(null);
            setCreditoCliente({ atingido: null, limiteMensal: null, titulosVencidos: null });
            setFreteSelecionado({ 201: null, 203: null });
        }

        setCliente(cli);

        if (!mudouCliente || !codigoNovo || !itensPedido.length) {
            if (mudouCliente) setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const resultados = await Promise.allSettled(
                itensPedido.map(async item => ({
                    seq: item.seq,
                    dados: await buscarDadosItem(item, { clienteAtual: cli })
                }))
            );
            const dadosPorSeq = new Map();
            const erros = [];

            resultados.forEach(resultado => {
                if (resultado.status === 'fulfilled') {
                    dadosPorSeq.set(resultado.value.seq, resultado.value.dados);
                } else {
                    erros.push(resultado.reason);
                }
            });

            if (idRecalculo === recalculoClienteId.current) {
                setItensPedido(prev => prev.map(item =>
                    dadosPorSeq.has(item.seq)
                        ? { ...item, ...dadosPorSeq.get(item.seq) }
                        : item
                ));
            }

            if (erros.length && idRecalculo === recalculoClienteId.current) {
                alert('Erro ao recalcular impostos, acordos ou histórico de alguns itens para o novo cliente.');
            }
        } finally {
            if (idRecalculo === recalculoClienteId.current) {
                setLoading(false);
            }
        }
    }

    async function carregarTiposLogradouro() {
        try {
            let offset = 0;
            const limit = 25;
            let hasMore = true;
            const itens = [];

            while (hasMore) {
                const response = await getTipLogradouro({ offset, limit });
                const data = response.data;

                itens.push(...(data.items || []));
                hasMore = Boolean(data.hasMore);
                offset += limit;
            }

            const tiposValidos = itens.filter(item => item.des_tipo && item.des_tipo.trim() !== '');
            setTiposLogradouro(tiposValidos);
        } catch (error) {
        }
    }

    async function buscarDadosItem(item, contexto = {}) {
        const clienteAtual = contexto.clienteAtual ?? cliente;
        const operacaoAtual = contexto.operacaoAtual ?? operacao;
        const condPgtoAtual = contexto.condPgtoAtual ?? CondPgto;
        // Busca estoque disponível
        const detalheItem = contexto.detalheItem || {};
        const [respImp, acordosComerciais, ultimaCompraItem] = await Promise.all([
            getImpostos({
                codOper: operacaoAtual.cod_oper,
                codUnidade: item.unidade,
                codPessoa: clienteAtual.cod_pessoa,
                codCondPgto: condPgtoAtual.cod_cond_pgto,
                codItem: item.cod_item
            }),
            carregarAcordosItem(item.cod_item, clienteAtual.cod_pessoa),
            carregarUltimaCompraItem(item.cod_item, clienteAtual.cod_pessoa)
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
        const indSubsMercadoria = Number(imp.ind_subs_mercadoria || 0);
        const valorLista = Number(imp.vlr_item || 0);

        let perDifal = 0;
        if (indSubsMercadoria === 1 && imp.txt_refaz_bc_st && imp.txt_refaz_bc_st.toUpperCase().includes('DIF')) {
            perDifal = Number(imp.per_subst_trib || 0) - Number(imp.per_icms || 0);
            imp.per_subst_trib = 0;
        }

        const impostos = {
            perIcms: imp.per_icms,
            perPis: imp.per_aliq_pis,
            perCofins: imp.per_aliq_cofins,
            perIpi: imp.per_ipi,
            perFcp: imp.per_fcp,
            perSubstTrib: indSubsMercadoria === 1 ? imp.per_subst_trib : 0,
            perDifal: indSubsMercadoria === 1 ? perDifal : 0,
            difal: indSubsMercadoria === 1 ? imp.txt_refaz_bc_st : null,
            idxSubsTrib: indSubsMercadoria === 1 ? imp.idx_subs_trib : null,
            listaST: indSubsMercadoria === 1 ? imp.cod_lista_st : null,
            // percentual de ICMS desonerado / Funrural — NÃO deve reduzir a sobra
            perFunrural: Number(imp.per_funrural || 0),
            indSubsMercadoria
        };

        // Base de ST se houver lista
        let baseST = null;
        if (impostos.indSubsMercadoria === 1 && impostos.listaST) {
            const respLista = await getListaPreco({
                lista: impostos.listaST,
                item: item.cod_item
            });
            const vlrListaST = respLista?.data?.items?.[0]?.vlr_item;
            baseST = Number(vlrListaST ?? valorLista ?? 0);
        }

        return {
            estoque,
            vlrMedio,
            ticktMedio: detalheItem.ticket_medio ?? item.ticktMedio ?? null,
            qtdMultiplo: detalheItem.qtd_multiplo ?? item.qtdMultiplo,
            qtdAltura: detalheItem.qtd_altura ?? item.qtdAltura,
            qtdLargura: detalheItem.qtd_largura ?? item.qtdLargura,
            qtdComprimento: detalheItem.qtd_comprimento ?? item.qtdComprimento,
            qtdM3: detalheItem.qtd_m3 ?? item.qtdM3,
            qtdM2: detalheItem.qtd_m2 ?? item.qtdM2,
            pesoBruto: detalheItem.qtd_peso_bruto ?? item.pesoBruto,
            valorLista,
            impostos,
            baseST,
            acordosComerciais,
            ultimaCompraItem
        };
    }

    async function carregarAcordosItem(codItem, codCliente = getCodigoPessoaCliente()) {
        const codigo = String(codItem ?? '').trim();
        const codigoCliente = String(codCliente ?? '').trim();
        const chave = `${codigoCliente}-${codigo}`;

        if (acordosItemCache.current.has(chave)) {
            return await acordosItemCache.current.get(chave);
        }

        const promise = getItensAcordos({
            codItem: codigo,
            codCliente: codigoCliente,
            offset: 0,
            limit: 25
        })
            .then(response => response.data.items || [])
            .catch(() => []);

        acordosItemCache.current.set(chave, promise);

        const acordos = await promise;
        acordosItemCache.current.set(chave, acordos);

        return acordos;
    }

    function itemPossuiAcordo(item) {
        return Boolean(item?.acordosComerciais?.length);
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

    async function carregarUltimaCompraItem(codItem, codCliente) {
        const chave = `${String(codItem ?? '').trim()}-${String(codCliente ?? '').trim()}`;

        if (ultimaCompraItemCache.current.has(chave)) {
            return await ultimaCompraItemCache.current.get(chave);
        }

        const promise = getItemUltimaCompra({
            codItem,
            codCliente,
            offset: 0,
            limit: 1
        })
            .then(response => response.data.items?.[0] || null)
            .catch(() => null);

        ultimaCompraItemCache.current.set(chave, promise);

        const ultimaCompra = await promise;
        ultimaCompraItemCache.current.set(chave, ultimaCompra);

        return ultimaCompra;
    }

    function formatarDataUltimaCompraItem(item) {
        return formatarDataHistoricoCliente(item?.ultimaCompraItem?.dta_emissao);
    }

    function criarItensPedido(itemLov) {
        const grupoId = nextId.current; 
        const itemBase = {
            grupoId,
            cod_item: itemLov.cod_item,
            descricao: itemLov.des_item,
            principiosAtivos: itemLov.principios_ativos,
            marca: itemLov.cod_completo,
            qtdMultiplo: null,
            qtdAltura: null,
            qtdLargura: null,
            qtdComprimento: null,
            qtdM3: null,
            qtdM2: null,
            pesoBruto: null,
            quantidade: '',
            estoque: 0,
            vlrMedio: 0,
            valorLista: 0,
            impostos: null,
            baseST: null,
            acordosComerciais: [],
            ultimaCompraItem: null,
            selecionado: false,
            valorFrete: 0
        };
        // Cria os dois itens (201 e 203)
        const item201 = { ...itemBase, seq: nextId.current, unidade: 201, estoque: itemLov.estoque_matriz };
        const item203 = { ...itemBase, seq: nextId.current + 1, unidade: 203, estoque: itemLov.estoque_filial };
        nextId.current += 2; // avança o contador

        return [item201, item203];
    }

    async function adicionarItem(itemLov) {
        const itensLov = Array.isArray(itemLov) ? itemLov : [itemLov];
        const novosItens = itensLov.flatMap(criarItensPedido);
        const multiplosItens = itensLov.length > 1;

        setItensPedido(prev => [...prev, ...novosItens]);
        setOpenLovItens(false);

        if (multiplosItens) {
            setLoading(true);
        }

        // Busca dados completos para cada item e atualiza
        try {
            const responseDetalhes = await getItensDetalhados({
                codItens: itensLov.map(item => item.cod_item)
            });
            const detalhesPorCodigo = new Map(
                (responseDetalhes.data?.items || []).map(item => [String(item.cod_item), item])
            );
            const resultados = await Promise.allSettled(
                novosItens.map(async item => ({
                    seq: item.seq,
                    dados: await buscarDadosItem(item, {
                        detalheItem: detalhesPorCodigo.get(String(item.cod_item))
                    })
                }))
            );
            const dadosPorSeq = new Map();
            const erros = [];

            resultados.forEach(resultado => {
                if (resultado.status === 'fulfilled') {
                    dadosPorSeq.set(resultado.value.seq, resultado.value.dados);
                    return;
                }

                erros.push(resultado.reason);
            });

            setItensPedido(prev =>
                prev.map(item =>
                    dadosPorSeq.has(item.seq)
                        ? { ...item, ...dadosPorSeq.get(item.seq) }
                        : item
                )
            );

            if (erros.length) {
                alert('Erro ao carregar informaÃ§Ãµes de estoque ou impostos para alguns itens adicionados.');
            }
        } catch (error) {
            alert('Erro ao carregar informações de estoque ou impostos para o item adicionado.');
        } finally {
            if (multiplosItens) {
                setLoading(false);
            }
        }
    }

    function removerItem(grupoId) {
        setItensPedido(prev => prev.filter(item => item.grupoId !== grupoId));
    }

    function removerItensPorUnidade(unidade) {
        setItensPedido(prev => prev.filter(item => item.unidade !== unidade));
        setFreteSelecionado(prev => ({
            ...prev,
            [unidade]: null
        }));
    }

    function handleQuantidadeChange(grupoId, valor) {
        setItensPedido(prev =>
            prev.map(item =>
                item.grupoId === grupoId ? { ...item, quantidade: valor } : item
            )
        );
    }

    function handleValorListaChange(seq, valor) {
        setItensPedido(prev =>
            prev.map(item =>
                item.seq === seq ? { ...item, valorLista: valor } : item
            )
        );
    }

    useEffect(() => {
        carregarTiposLogradouro();
    }, []);

    function validarMultiplo(grupoId) {
        const item = itensPedido.find(i => i.grupoId === grupoId);
        if (!item) return;

        const qtd = Number(item.quantidade);
        const multiplo = Number(item.qtdMultiplo);

        if (!qtd || !multiplo) return;

        if (qtd % multiplo !== 0) {
            setModalErro({
                aberto: true,
                mensagem: `Quantidade informada não está de acordo com a quantidade múltipla do item: ${multiplo}.`,
                seqItem: item.seq
            });
            // Limpa a quantidade do item com erro
            handleQuantidadeChange(grupoId, '');
        }
    }

    function handleCheckboxChange(grupoId, checked) {
        setItensPedido(prev =>
            prev.map(item =>
                item.grupoId === grupoId ? { ...item, selecionado: checked } : item
            )
        );
    }

    function selecionarTodosItens(selecionado) {
        setItensPedido(prev => prev.map(item => ({ ...item, selecionado })));
        setMenuSelecaoItensOpen(null);
    }

    function selecionarItensPorUnidade(unidade, selecionado) {
        setItensPedido(prev =>
            prev.map(item =>
                Number(item.unidade) === Number(unidade)
                    ? { ...item, selecionado }
                    : item
            )
        );
        setMenuSelecaoItensOpen(null);
    }

    function calcularValoresItem(item) {
        const qtd = Number(item.quantidade || 0);
        const vlrLista = Number(item.valorLista || 0);
        const vlrMedio = Number(item.vlrMedio || 0);

        if (!qtd || !vlrLista) {
            return {
                valorVendaTotal: 0,
                sobraReal: 0,
                sobraPercentual: 0,
                icms: 0,
                pis: 0,
                cofins: 0,
                ipi: 0,
                difal: 0,
                st: 0,
                fcp: 0
            };
        }

        const valorVendaTotal = qtd * vlrLista;
        const valorCustoTotal = qtd * vlrMedio;

        const imp = item.impostos || {};
        const indSubsMercadoria = Number(imp.indSubsMercadoria || 0)
        // ===== IMPOSTOS BÁSICOS =====
        const icms = valorVendaTotal * (Number(imp.perIcms || 0) / 100);
        const pis = valorVendaTotal * (Number(imp.perPis || 0) / 100);
        const cofins = valorVendaTotal * (Number(imp.perCofins || 0) / 100);
        const ipi = valorVendaTotal * (Number(imp.perIpi || 0) / 100);
        const fcp = valorVendaTotal * (Number(imp.perFcp || 0) / 100);

        let difal = 0;
        let st = 0;

        if (indSubsMercadoria === 1) {
            if (imp.difal && imp.difal.toUpperCase().includes('DIF')) {
                const perDifal = Number(imp.perDifal || 0);
                difal = valorVendaTotal * (perDifal / 100);
            } else {
                // 2.1 — ST por LISTA (prioridade maior que índice)
                if (item.baseST) {
                    const baseTotal = item.baseST * qtd;
                    st = baseTotal * (Number(imp.perSubstTrib || 0) / 100);
                }
                // 2.2 — ST por ÍNDICE
                else if (imp.idxSubsTrib) {
                    const baseTotal = (vlrLista * imp.idxSubsTrib) * qtd;
                    st = baseTotal * (Number(imp.perSubstTrib || 0) / 100);
                } else {
                    const baseTotal = vlrLista * qtd;
                    st = baseTotal * (Number(imp.perSubstTrib || 0) / 100);
                }
            }
        }

        const totalImpostos = icms + pis + cofins + ipi + difal + st + fcp;

        // Funrural (ICMS desonerado) — não reduz a sobra, mas precisa ser mostrado e acumulado separadamente
        const perFunrural = Number(imp.perFunrural || imp.per_funrural || 0);
        const valorFunrural = valorVendaTotal * (perFunrural / 100);

        const sobraBruta = valorVendaTotal - valorCustoTotal;
        const frete = Number(item.valorFrete || 0);
        const sobraReal = sobraBruta - totalImpostos - frete; // nota: não subtrai Funrural
        const sobraPercentual = valorVendaTotal > 0 ? (sobraReal / valorVendaTotal) * 100 : 0;
        return {
            valorVendaTotal,
            valorCustoTotal,
            icms,
            pis,
            cofins,
            ipi,
            difal,
            st,
            fcp,
            valorFunrural,
            totalImpostos,
            sobraBruta,
            sobraReal,
            sobraPercentual
        };
    }

    function formatarDataHistoricoCliente(data) {
        if (!data) return '-';

        const dataCompra = new Date(data);
        if (Number.isNaN(dataCompra.getTime())) return '-';

        return dataCompra.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    function getStatusHistoricoCliente() {
        const dias = Number(historicoCliente.ultimaCompra?.dias_da_ultima_compra);

        if (!historicoCliente.ultimaCompra || Number.isNaN(dias)) {
            return {
                classe: 'cliente-historico-vermelho',
                texto: 'Nunca comprado'
            };
        }

        if (dias <= 45) {
            return {
                classe: 'cliente-historico-verde',
                texto: 'Compra recente'
            };
        }

        return {
            classe: 'cliente-historico-amarelo',
            texto: 'Compra antiga'
        };
    }

    function clienteTemDadosPedido(cli) {
        if (!cli) return false;

        return [
            'cod_oper', 'des_oper', 'cod_cond_pgto', 'des_cond_pgto', 'pmv',
            'atingido', 'vlr_lim_mensal', 'qtd_titulos_vencidos'
        ]
            .every(campo => Object.prototype.hasOwnProperty.call(cli, campo));
    }

    async function buscarDetalhesClientePedido(cli) {
        const codCliente = String(cli?.cod_pessoa ?? '').trim();

        if (dadosClienteCache.current.has(codCliente)) {
            return dadosClienteCache.current.get(codCliente);
        }

        if (clienteTemDadosPedido(cli)) {
            dadosClienteCache.current.set(codCliente, cli);
            return cli;
        }

        const response = await getClienteByFilter({
            filtro: cli.cod_pessoa,
            offset: 0,
            limit: 1
        });

        const dadosCliente = response.data.items?.[0] || cli;
        dadosClienteCache.current.set(codCliente, dadosCliente);

        return dadosCliente;
    }

    async function carregarRepresentanteCliente(codCliente) {
        const codigo = String(codCliente ?? '').trim();

        if (representanteClienteCache.current.has(codigo)) {
            return representanteClienteCache.current.get(codigo);
        }

        const response = await getRepresentantesByCliente({
            filtro: codigo,
            offset: 0,
            limit: 1
        });
        const representanteCliente = response.data.items?.[0] || null;

        representanteClienteCache.current.set(codigo, representanteCliente);

        return representanteCliente;
    }

    async function buscarClientePorCodigo() {
        const codigoCliente = String(codClienteDigitado ?? '').trim();

        if (!codigoCliente) {
            setLoadingDadosCliente(false);
            return;
        }

        if (String(cliente?.cod_pessoa ?? '').trim() === codigoCliente) {
            return;
        }

        setLoadingDadosCliente(true);

        try {
            const response = await getClienteByFilter({
                filtro: codigoCliente,
                offset: 0,
                limit: 1
            });
            const cli = response.data.items[0];
            if (!cli) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Cliente não encontrato com o código digitado!'
                });
                atualizarCliente(null);
                setLoadingDadosCliente(false);
                return;
            }
            atualizarCliente(cli);
        } catch (error) {
            setLoadingDadosCliente(false);
            alert('Erro ao buscar cliente');
        }
    }

    async function buscarClienteTriangulacaoPorCodigo() {
        if (!codClienteTriangulacaoDigitado) return;
        try {
            const response = await getClienteByFilter({
                filtro: codClienteTriangulacaoDigitado,
                offset: 0,
                limit: 1
            });
            const cli = response.data.items[0];
            if (!cli) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Cliente de triangulacao nao encontrado!'
                });
                setClienteTriangulacao(null);
                return;
            }
            setClienteTriangulacao(cli);
        } catch (error) {
            alert('Erro ao buscar cliente de triangulacao');
        }
    }

    async function buscarRepresentantePorCodigo() {
        if (!codRepresentanteDigitado) return;
        try {
            const response = await getRepresentantesByIdCliente({
                representante: codRepresentanteDigitado,
                cliente: codClienteDigitado,
                offset: 0,
                limit: 1
            });
            const rep = response.data.items[0];
            if (!rep) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Representante não encontrado!'
                });
                setRepresentante(null)
                return ;
            }
             
            setRepresentante(rep);
        } catch (error) {
            alert('Erro ao buscar representante');
        }
    }

    async function buscarOperacaoPorCodigo() {
        if (!codOperacaoDigitado) return;
        try {
            const response = await getOperacoesByFilter({
                filtro: codOperacaoDigitado,
                offset: 0,
                limit: 1
            });
            const oper = response.data.items[0];
            if (!oper) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Operação não encontrada!'
                });
                setOperacao({ cod_oper: null, des_oper: null });
                return;
            }
            setOperacao(oper);
        } catch (error) {
            alert('Erro ao buscar operação');
        }
    }

    async function buscarOperacaoTriangulacaoPorCodigo() {
        if (!codOperacaoTriangulacaoDigitado) return;
        try {
            const response = await getOperacoesByFilter({
                filtro: codOperacaoTriangulacaoDigitado,
                offset: 0,
                limit: 1
            });
            const oper = response.data.items[0];
            if (!oper) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Operação da triangulação não encontrada!'
                });
                setOperacaoTriangulacao({ cod_oper: null, des_oper: null });
                return;
            }
            setOperacaoTriangulacao({
                cod_oper: oper.cod_oper,
                des_oper: oper.des_oper
            });
        } catch (error) {
            alert('Erro ao buscar operação da triangulação');
        }
    }

    async function buscarCondPgtoPorCodigo() {
        if (!codCondPgtoDigitado) return;
        try {
            const response = await getCondPgtoByFilter({
                filtro: codCondPgtoDigitado,
                offset: 0,
                limit: 1
            });
            const cond = response.data.items[0];
            if (!cond) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Condição de Pagamento não encontrado!'
                });
                setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
                return;
            }
            setCondPgto(cond);
        } catch (error) {
            alert('Erro ao buscar condição de pagamento');
        }
    }

    async function aplicarCep(cep) {
        if (!cep) {
            limparEnderecoCep();
            return;
        }

        setCodCepDigitado(cep.num_cep || '');
        setLogradouroDigitado(cep.des_logradouro || '');
        setBairroDigitado(cep.des_bairro || '');
        setTipoLogradouroSelecionado(getDescricaoTipoLogradouro(cep.cod_tipo));
        setCodCidadeDigitado(cep.cod_ibge ? String(cep.cod_ibge) : '');
        setCidade(cep.cod_ibge ? {
            cod_ibge: cep.cod_ibge,
            des_cidade: cep.des_cidade,
            cod_uf: cep.cod_uf
        } : null);
        await carregarUfPorCodigo(cep.cod_uf);
    }

    async function aplicarEnderecoEntrega(endereco) {
        if (!endereco) {
            limparEnderecoCep();
            return;
        }

        if (endereco.num_cep) {
            try {
                const response = await getCepsByFilter({
                    filtro: endereco.num_cep,
                    offset: 0,
                    limit: 1
                });
                const cepEncontrado = response.data.items?.[0];

                if (cepEncontrado) {
                    await aplicarCep(cepEncontrado);
                    setNumeroEnderecoDigitado(endereco.num_logradouro || '');
                    setTipoLogradouroSelecionado(getDescricaoTipoLogradouro(endereco.cod_tipo_logradouro));
                    return;
                }
            } catch (error) {
            }
        }

        setCodCepDigitado(endereco.num_cep || '');
        setLogradouroDigitado(endereco.des_endereco || '');
        setBairroDigitado(endereco.des_bairro || '');
        setNumeroEnderecoDigitado(endereco.num_logradouro || '');
        setTipoLogradouroSelecionado(getDescricaoTipoLogradouro(endereco.cod_tipo_logradouro));
        setCodCidadeDigitado('');
        setCidade(endereco.des_cidade ? {
            cod_ibge: '',
            des_cidade: endereco.des_cidade,
            cod_uf: endereco.cod_uf
        } : null);
        await carregarUfPorCodigo(endereco.cod_uf);
    }

    function abrirLovEnderecos() {
        if (!getCodigoPessoaCliente()) {
            setModalErro({
                aberto: true,
                mensagem: 'Selecione um cliente antes de consultar os enderecos!'
            });
            return;
        }

        setOpenLovEnderecos(true);
    }

    async function carregarEnderecoPadraoCliente() {
        const codPessoa = getCodigoPessoaCliente();

        if (!codPessoa) {
            setModalErro({
                aberto: true,
                mensagem: 'Selecione um cliente antes de consultar o endereco padrao!'
            });
            return;
        }

        try {
            const response = await getEnderecosPadraoByFilter({
                filtro: codPessoa,
                offset: 0,
                limit: 1
            });

            const enderecoPadrao = response.data.items?.[0];

            if (!enderecoPadrao) {
                limparEnderecoCep();
                setModalErro({
                    aberto: true,
                    mensagem: 'Cliente nao possui endereco padrao cadastrado!'
                });
                return;
            }

            await aplicarEnderecoEntrega(enderecoPadrao);
        } catch (error) {
            alert('Erro ao buscar endereco padrao');
        }
    }

    async function buscarCepPorCodigo() {
        if (!codCepDigitado) {
            limparEnderecoCep();
            return;
        }

        try {
            const response = await getCepsByFilter({
                filtro: codCepDigitado,
                offset: 0,
                limit: 1
            });
            const cep = response.data.items?.[0];

            if (!cep) {
                limparEnderecoCep();
                return;
            }

            await aplicarCep(cep);
        } catch (error) {
            alert('Erro ao buscar CEP');
        }
    }

    async function buscarCidadePorCodigo() {
        if (!codCidadeDigitado) {
            setCidade(null);
            setUf(null);
            setCodUfDigitado('');
            return;
        }

        try {
            const response = await getCidadesByFilter({
                filtro: codCidadeDigitado,
                offset: 0,
                limit: 1
            });
            const cid = response.data.items[0];

            if (!cid) {
                setCidade(null);
                setUf(null);
                setCodUfDigitado('');
                return;
            }

            setCidade(cid);
            setCodCidadeDigitado(cid.cod_ibge);
            await carregarUfPorCodigo(cid.cod_uf);
        } catch (error) {
            alert('Erro ao buscar cidade');
        }
    }

    async function carregarUfPorCodigo(codigoUf) {
        if (!codigoUf) {
            setUf(null);
            setCodUfDigitado('');
            return;
        }

        try {
            const response = await getUfByFilter({
                filtro: codigoUf,
                offset: 0,
                limit: 1
            });
            const ufEncontrada = response.data.items[0];

            if (!ufEncontrada) {
                setUf(null);
                setCodUfDigitado(String(codigoUf));
                return;
            }

            setUf(ufEncontrada);
            setCodUfDigitado(ufEncontrada.cod_uf);
        } catch (error) {
            alert('Erro ao buscar UF');
        }
    }

    async function buscarUfPorCodigo() {
        if (!codUfDigitado) {
            setUf(null);
            return;
        }

        await carregarUfPorCodigo(codUfDigitado);
    }

    async function cotar() {
        setLoading(true); 
        try{
            const itensSelecionados = itensPedido.filter(item => item.selecionado);

            setFreteSelecionado({ 201: null, 203: null });
            setItensPedido(prev => prev.map(item => ({ ...item, valorFrete: 0 })));

            if (itensSelecionados.length === 0) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Selecione pelo menos um item para cotar o frete.'
                });
                return;
            }

            const itensInvalidos = itensSelecionados.some(i =>
                !i.unidade || !i.quantidade || Number(i.quantidade) <= 0
            );

            if (itensInvalidos) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Todos os itens selecionados devem possuir quantidade válida'
                });
                return;
            }

            const retorno = await cotarSimFrete(itensSelecionados, cliente);
            const selecaoAuto = {};
            const unidadesSemCotacao = [];

            retorno.forEach(r => {
                const primeiraTransportadora = r.transportadoras?.[0];

                if (primeiraTransportadora) {
                    selecaoAuto[r.unidade] = primeiraTransportadora;
                    return;
                }

                unidadesSemCotacao.push(r.unidade);
            });

            if (unidadesSemCotacao.length) {
                setModalErro({
                    aberto: true,
                    mensagem: `Nenhuma transportadora retornada para a(s) unidade(s): ${unidadesSemCotacao.join(', ')}.`
                });
                return;
            }

            setFreteSelecionado(selecaoAuto);
            aplicarRateioFrete(selecaoAuto);
        }catch (err){
            alert(err.message || 'Erro ao cotar frete');
        }finally{
            setLoading(false);
        }
    }

    function aplicarRateioFrete(selecionados) {
        const FATOR_CUBAGEM = 300; // 1 m³ = 300 kg
        setItensPedido(prev => {
            let novosItens = prev.map(item => ({ ...item, valorFrete: 0 }));

        Object.entries(selecionados).forEach(([unidade, frete]) => {

            const valorFrete = Number(frete.valor);
            if (isNaN(valorFrete) || valorFrete <= 0) {
                return;
            }

            const indicesItensUnidade = [];
            novosItens.forEach((item, index) => {
                if (Number(item.unidade) === Number(unidade) && item.selecionado) {
                    indicesItensUnidade.push(index);
                }
            });

            if (indicesItensUnidade.length === 0) {
                return;
            }

            const pesosCobranca = indicesItensUnidade.map(index => {
                const item = novosItens[index];
                const qtd = Number(item.quantidade) || 0;
                const pesoReal = (Number(item.pesoBruto) || 0) * qtd;
                const volumeTotal = (Number(item.qtdM3) || 0) * qtd;
                const pesoCubado = volumeTotal * FATOR_CUBAGEM;
                const peso = Math.max(pesoReal, pesoCubado);
                return peso;
            });

            const totalPesoCobranca = pesosCobranca.reduce((soma, peso) => soma + peso, 0);

            if (totalPesoCobranca === 0) {
                const quantidades = indicesItensUnidade.map(index => Number(novosItens[index].quantidade) || 0);
                const totalQuantidade = quantidades.reduce((soma, q) => soma + q, 0);
                if (totalQuantidade === 0) {
                    return;
                }
                indicesItensUnidade.forEach((itemIndex, i) => {
                    const proporcao = quantidades[i] / totalQuantidade;
                    novosItens[itemIndex].valorFrete = Number((proporcao * valorFrete).toFixed(2));
                });
            } else {
                indicesItensUnidade.forEach((itemIndex, i) => {
                    const proporcao = pesosCobranca[i] / totalPesoCobranca;
                    novosItens[itemIndex].valorFrete = Number((proporcao * valorFrete).toFixed(2));
                });
            }
        });

            return novosItens;
        });
    }

    function abrirNovaObs() {
        setObsEditando(null);
        setOpenObsModal(true);
    }

    function editarObs(obs) {
        setObsEditando(obs);
        setOpenObsModal(true);
    }

    function salvarObs(obs) {
        if (obsEditando) {
            setObservacoes(prev =>
                prev.map(o => o.num_seq === obs.num_seq ? obs : o)
            );
        } else {
            setObservacoes(prev => [
                ...prev,
                { ...obs, num_seq: prev.length + 1 }
            ]);
        }

        setOpenObsModal(false);
    }

    function removerObs(seq) {
        const lista = observacoes
            .filter(o => o.num_seq !== seq)
            .map((o, i) => ({ ...o, num_seq: i + 1 }));

        setObservacoes(lista);
    }

    function dataAtualErp() {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();

        return `${dia}/${mes}/${ano}`;
    }

    function apenasNumeros(valor) {
        return String(valor ?? '').replace(/\D/g, '');
    }

    function limparCamposVazios(valor) {
        if (Array.isArray(valor)) {
            return valor
                .map(limparCamposVazios)
                .filter(item => item !== null && item !== undefined);
        }

        if (valor && typeof valor === 'object') {
            return Object.entries(valor).reduce((acc, [chave, item]) => {
                const itemLimpo = limparCamposVazios(item);

                if (itemLimpo === null || itemLimpo === undefined || itemLimpo === '') {
                    return acc;
                }

                if (Array.isArray(itemLimpo) && itemLimpo.length === 0) {
                    return acc;
                }

                acc[chave] = itemLimpo;
                return acc;
            }, {});
        }

        return valor;
    }

    function valorDecimalErp(valor) {
        const valorTexto = String(valor ?? '0').trim();

        if (valorTexto.includes(',')) {
            return valorTexto.replace(/[^\d,]/g, '');
        }

        return Number(valor || 0).toFixed(2).replace('.', ',');
    }

    function getUsuarioIntegracao() {
        const params = new URLSearchParams(window.location.search);

        return (
            params.get('usuario') ||
            params.get('user') ||
            params.get('codUsuario') ||
            params.get('cod_usuario') ||
            ''
        ).trim();
    }

    function validarPedidoErp() {
        if (!itensPedido.length) {
            return {
                mensagem: 'Informe ao menos um item antes de enviar o pedido.'
            };
        }

        const itemSemQuantidade = itensPedido.find(item => {
            const quantidade = Number(item.quantidade);
            return !Number.isFinite(quantidade) || quantidade <= 0;
        });

        if (itemSemQuantidade) {
            return {
                mensagem: `Informe uma quantidade valida para o item ${itemSemQuantidade.seq}.`,
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

        return null;
    }

    function temEnderecoEntrega() {
        return Boolean(
            codCepDigitado ||
            logradouroDigitado ||
            bairroDigitado ||
            numeroEnderecoDigitado ||
            complementoEnderecoDigitado ||
            referenciaEnderecoDigitado ||
            tipoLogradouroSelecionado
        );
    }

    function montarPeObservacoes() {
        const observacoesMarcadas = observacoes.filter(obs =>
            obs.pedido || obs.nota || obs.registro || obs.financeiro
        );

        if (!observacoesMarcadas.length) {
            return null;
        }

        return observacoesMarcadas.map((obs, index) => ({
            txtObs: obs.descricao || '-',
            indPedido: obs.pedido ? 1 : 0,
            indNf: obs.nota ? 1 : 0,
            indRegistro: obs.registro ? 1 : 0,
            indCr: obs.financeiro ? 1 : 0,
            numSeq: index + 1,
            tipTransacao: 1
        }));
    }

    function montarPeEndEntrega(unidadePedido, dataTransacao) {
        if (!temEnderecoEntrega()) {
            return null;
        }

        const endereco = [tipoLogradouroSelecionado, logradouroDigitado].filter(Boolean).join(' ');

        return limparCamposVazios({
            codEmp: '01',
            codUnidade: unidadePedido,
            codCompl: 99,
            desEndereco: endereco || logradouroDigitado,
            desBairro: bairroDigitado,
            numCep: Number(apenasNumeros(codCepDigitado)),
            numLogradouro: Number(apenasNumeros(numeroEnderecoDigitado) || 0),
            dtaTransacao: dataTransacao,
            tipTransacao: 1
        });
    }

    function montarPayloadPedidoErpPorUnidade(unidadePedido, itensUnidade) {
        const dataErp = dataAtualErp();
        const dataTransacao = dataCargaDigitada || dataErp;
        const peObservacoes = montarPeObservacoes();
        const peEndEntrega = montarPeEndEntrega(unidadePedido, dataTransacao);

        const pePedidos = {
            codEmp: '01',
            codUnidade: unidadePedido,
            numPedido: '0',
            numSeqConf: 2,
            codCompl: 99,
            desNumOcCliente: ordemCompra || null,
            codSituacao: 6,
            dtaEmissao: dataErp,
            dtaDigitacao: dataErp,
            tipFrete: 1,
            codCondPgto: String(CondPgto.cod_cond_pgto),
            codOper: String(operacao.cod_oper),
            codOperRemessa: operacaoTriangulacao.cod_oper ? String(operacaoTriangulacao.cod_oper) : null,
            indConsumidor: 1,
            codCliente: String(cliente.cod_pessoa),
            codClienteRemessa: clienteTriangulacao?.cod_pessoa ? String(clienteTriangulacao.cod_pessoa) : null,
            tipTransacao: 1,
            peItens: itensUnidade.map((item, index) => ({
                codItem: String(item.cod_item),
                qtdNegociada: Number(item.quantidade),
                vlrUniBruto: valorDecimalErp(item.valorLista),
                codUnidadeRetira: unidadePedido,
                tipTransacao: 1,
                qtdReservada: Number(item.quantidade),
                indVlrAlterado: 0,
                numItem: index + 1
            }))
        };

        if (peObservacoes) {
            pePedidos.peObservacoes = peObservacoes;
        }

        if (peEndEntrega) {
            pePedidos.peEndEntrega = peEndEntrega;
        }

        return limparCamposVazios({
            codEmp: '01',
            codMaquina: 1,
            usuario: getUsuarioIntegracao() || null,
            pePedidos
        });
    }

    function montarPayloadsPedidoErp(unidadesSelecionadas = [201, 203]) {
        const erroValidacao = validarPedidoErp();

        if (erroValidacao) {
            throw erroValidacao;
        }

        const unidades = unidadesSelecionadas.map(Number);

        if (!unidades.length) {
            throw { mensagem: 'Selecione ao menos uma unidade para gerar o pedido.' };
        }

        return unidades
            .map(unidade => ({
                unidade,
                itens: itensPedido.filter(item => Number(item.unidade) === unidade)
            }))
            .filter(grupo => grupo.itens.length)
            .map(grupo => montarPayloadPedidoErpPorUnidade(grupo.unidade, grupo.itens));
    }

    function abrirSelecaoUnidadesPedido() {
        const erroValidacao = validarPedidoErp();

        if (erroValidacao) {
            setModalErro({ aberto: true, ...erroValidacao });
            return;
        }

        setOpenLovUnidadesPedido(true);
    }

    async function finalizarPedidoErp(unidadesSelecionadas) {
        try {
            setOpenLovUnidadesPedido(false);
            setLoading(true);

            const payloads = montarPayloadsPedidoErp(unidadesSelecionadas);

            const responses = await Promise.all(payloads.map(async payload => {
                const response = await enviarPedidoErp(payload);

                return {
                    unidade: payload.pePedidos.codUnidade,
                    data: response.data
                };
            }));

            const pedidos = responses
                .sort((a, b) => Number(a.unidade) - Number(b.unidade))
                .map(response => `Pedido ${response.unidade}: ${response.data.numPedido}`)
                .join('\n');

            setModalSucesso({
                aberto: true,
                mensagem: pedidos
            });
        } catch (error) {

            const erroBackend = error?.response?.data;
            const detalheErro = erroBackend?.detalhe
                ? JSON.stringify(erroBackend.detalhe)
                : error.message;
            const etapaErro = erroBackend?.etapa ? ` Etapa: ${erroBackend.etapa}.` : '';
            const pedidoErro = erroBackend?.numPedido ? ` Pedido: ${erroBackend.numPedido}.` : '';

            setModalErro({
                aberto: true,
                seqItem: error?.seqItem || null,
                mensagem: erroBackend
                    ? `${erroBackend.erro}.${etapaErro}${pedidoErro} Detalhe: ${detalheErro}`
                    : error.mensagem || error.message || 'Erro ao integrar pedido com o ERP.'
            });
        } finally {
            setLoading(false);
        }
    }

    async function carregarObservacoesCliente(codCliente) {
        try {
            const response = await getClientesComentarios({
                filtro: codCliente,
                offset: 0,
                limit: 50
            });

            const lista = response.data.items || [];

            const observacoesFormatadas = lista
                .sort((a, b) => (a.seq_exibicao || 0) - (b.seq_exibicao || 0))
                .map((obs, index) => ({
                    num_seq: index + 1,
                    seq_comentario: obs.seq_comentario,
                    descricao: obs.des_comentario,
                    pedido: false,
                    nota: false,
                    registro: false,
                    financeiro: false
                }));

            setObservacoes(observacoesFormatadas);
        } catch (error) {
        }
    }

    async function carregarHistoricoCliente(codCliente) {
        const codigo = String(codCliente ?? '').trim();

        if (historicoClienteCache.current.has(codigo)) {
            setHistoricoCliente({
                loading: false,
                ultimaCompra: historicoClienteCache.current.get(codigo),
                erro: false
            });
            return;
        }

        setHistoricoCliente({
            loading: true,
            ultimaCompra: null,
            erro: false
        });

        try {
            const response = await getClientesHistorico({
                filtro: codCliente,
                offset: 0,
                limit: 1
            });

            const ultimaCompra = response.data.items?.[0] || null;
            historicoClienteCache.current.set(codigo, ultimaCompra);

            setHistoricoCliente({
                loading: false,
                ultimaCompra,
                erro: false
            });
        } catch (error) {
            setHistoricoCliente({
                loading: false,
                ultimaCompra: null,
                erro: true
            });
        }
    }

    useEffect(() => {
        if (!cliente) {
            setRepresentante(null);
            setOperacao({ cod_oper: null, des_oper: null });
            setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
            setPrazoMedioVenda(null);
            setCreditoCliente({ atingido: null, limiteMensal: null, titulosVencidos: null });
            setCodRepresentanteDigitado('');
            setCodOperacaoDigitado('');
            setCodCondPgtoDigitado('');
            setObservacoes([]);
            setHistoricoCliente({ loading: false, ultimaCompra: null, erro: false });
            setLoadingDadosCliente(false);
            setObsEditando(null);
            setOpenObsModal(false);
            return;
        }

        const codCliente = String(cliente.cod_pessoa ?? '').trim();
        let carregamentoCancelado = false;

        setLoadingDadosCliente(true);

        const representantePromise = carregarRepresentanteCliente(codCliente);
        const detalhesClientePromise = buscarDetalhesClientePedido(cliente);
        const observacoesPromise = carregarObservacoesCliente(codCliente);
        const historicoPromise = carregarHistoricoCliente(codCliente);

        representantePromise.then(representanteCliente => {
            if (carregamentoCancelado) return;

            setRepresentante(representanteCliente);
            setCodRepresentanteDigitado(representanteCliente?.cod_pessoa_rep || '');
        }).catch(() => {
            if (carregamentoCancelado) return;

            setRepresentante(null);
            setCodRepresentanteDigitado('');
        });

        detalhesClientePromise.then(dadosClientePedido => {
            if (carregamentoCancelado) return;

            setOperacao({
                cod_oper: dadosClientePedido?.cod_oper || null,
                des_oper: dadosClientePedido?.des_oper || null
            });
            setCodOperacaoDigitado(dadosClientePedido?.cod_oper || '');
            setCondPgto({
                cod_cond_pgto: dadosClientePedido?.cod_cond_pgto || null,
                des_cond_pgto: dadosClientePedido?.des_cond_pgto || null
            });
            const numeroOuNull = valor => {
                if (valor === null || valor === undefined || valor === '') return null;
                const numero = Number(valor);
                return Number.isFinite(numero) ? numero : null;
            };
            const pmv = numeroOuNull(dadosClientePedido?.pmv);
            const atingido = numeroOuNull(dadosClientePedido?.atingido);
            const limiteMensal = numeroOuNull(dadosClientePedido?.vlr_lim_mensal);
            const titulosVencidos = numeroOuNull(dadosClientePedido?.qtd_titulos_vencidos);
            setPrazoMedioVenda(pmv);
            setCreditoCliente({
                atingido,
                limiteMensal,
                titulosVencidos
            });
            setCodCondPgtoDigitado(dadosClientePedido?.cod_cond_pgto || '');
        }).catch(() => {
            if (carregamentoCancelado) return;

            setOperacao({ cod_oper: null, des_oper: null });
            setCodOperacaoDigitado('');
            setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
            setPrazoMedioVenda(null);
            setCreditoCliente({ atingido: null, limiteMensal: null, titulosVencidos: null });
            setCodCondPgtoDigitado('');
        });

        Promise.allSettled([
            representantePromise,
            detalhesClientePromise,
            observacoesPromise,
            historicoPromise
        ]).finally(() => {
            if (!carregamentoCancelado) {
                setLoadingDadosCliente(false);
            }
        });

        return () => {
            carregamentoCancelado = true;
        };
    }, [cliente]);

    const itensAgrupados = Array.from(
        itensPedido.reduce((grupos, item) => {
            if (!grupos.has(item.grupoId)) {
                grupos.set(item.grupoId, { grupoId: item.grupoId });
            }

            const grupo = grupos.get(item.grupoId);
            grupo[item.unidade] = item;
            return grupos;
        }, new Map()).values()
    );
    const itens201 = itensPedido.filter(item => item.unidade === 201);
    const itens203 = itensPedido.filter(item => item.unidade === 203);
    const statusHistoricoCliente = getStatusHistoricoCliente();
    const limiteCreditoRuim = creditoCliente.atingido !== null
        && (creditoCliente.atingido < 0 || creditoCliente.atingido > 100);
    const possuiTitulosVencidos = Number(creditoCliente.titulosVencidos || 0) > 0;
    const statusCreditoCliente = limiteCreditoRuim && possuiTitulosVencidos
        ? { classe: 'cliente-historico-vermelho', texto: 'Limite atingido e títulos vencidos' }
        : limiteCreditoRuim || possuiTitulosVencidos
            ? { classe: 'cliente-historico-amarelo', texto: 'Atenção à situação financeira' }
            : { classe: 'cliente-historico-verde', texto: 'Situação financeira regular' };
    const possuiDadosFinanceiros = prazoMedioVenda !== null
        || Object.values(creditoCliente).some(valor => valor !== null);

    function renderInfoItem(item, valores) {
        if (!item) return '-';

        const freteItem = freteSelecionado[item.unidade];
        const possuiAcordo = itemPossuiAcordo(item);

        return (
            <div className="info-cell-content">
                <IoInformationOutline className="icon info-icon" />
                <div className="tooltip-info">
                    <strong>Detalhes do Item</strong>
                    <div className="tip-linha"><span className="tip-nome">ICMS:</span><span className="tip-valor">{format.moeda(valores.icms ?? 0)}</span><span className="tip-percent">{format.percentual(item.impostos?.perIcms)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">ICMS ST:</span><span className="tip-valor">{format.moeda(valores.st ?? 0)}</span><span className="tip-percent">{format.percentual(item.impostos?.perSubstTrib)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">DIFAL:</span><span className="tip-valor">{format.moeda(valores.difal ?? 0)}</span><span className="tip-percent">{format.percentual(item.impostos?.perDifal)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">PIS:</span><span className="tip-valor">{format.moeda(valores.pis ?? 0)}</span><span className="tip-percent">{format.percentual(item.impostos?.perPis)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">COFINS:</span><span className="tip-valor">{format.moeda(valores.cofins ?? 0)}</span><span className="tip-percent">{format.percentual(item.impostos?.perCofins)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">IPI:</span><span className="tip-valor">{format.moeda(valores.ipi ?? 0)}</span><span className="tip-percent">{format.percentual(item.impostos?.perIpi)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">FCP:</span><span className="tip-valor">{format.moeda(valores.fcp ?? 0)}</span><span className="tip-percent">{format.percentual(item.impostos?.perFcp)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">ICMS deson (Funrural):</span><span className="tip-valor">{format.moeda(valores.valorFunrural ?? 0)}</span><span className="tip-percent">{format.percentual(item.impostos?.perFunrural)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">Frete rateado:</span><span className="tip-valor">{format.moeda(item.valorFrete ?? 0)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">Sobra:</span><span className="tip-valor">{format.moeda(valores.sobraReal ?? 0)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">Transportadora:</span><span className="tip-valor">{freteItem?.nome || '-'}</span></div>
                    <div className="tip-linha"><span className="tip-nome">Prazo:</span><span className="tip-valor">{freteItem ? `${freteItem.prazo} dias` : '-'}</span></div>
                    <div className="tip-linha"><span className="tip-nome">Última compra:</span><span className="tip-valor">{formatarDataUltimaCompraItem(item)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">Ticket médio:</span><span className="tip-valor">{item.ticktMedio != null ? format.moeda(item.ticktMedio) : '-'}</span></div>
                    {possuiAcordo && (
                        <div className="tooltip-acordo">
                            <strong>Item possui acordo comercial</strong>
                            <div className="tip-linha"><span className="tip-nome">Pedidos:</span><span className="tip-valor">{getPedidosAcordoTexto(item.acordosComerciais)}</span></div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="pedido-venda-container">
            <div className="pedido-card">
                <h2 className="pedido-title">Pedido de Venda</h2>
                <div className="form-grid">

                    {/* Cliente */}
                    <label>Cliente:</label>
                    <div className="field-group full">
                        <input type="text" className='input-cod'
                            value={codClienteDigitado}
                            onChange={(e) => { setCodClienteDigitado(e.target.value); }}
                            onBlur={() => buscarClientePorCodigo(codClienteDigitado)}
                        />
                        <input type="text" className='input-desc' value={cliente?.des_pessoa || ''} readOnly />
                        {cliente && (
                            <div className="cliente-historico-info">
                                <span
                                    className={`cliente-historico-sinaleira ${statusHistoricoCliente.classe}`}
                                    title={statusHistoricoCliente.texto}
                                    aria-label={statusHistoricoCliente.texto}
                                />
                                <div className="tooltip-info cliente-historico-tooltip">
                                    <div className='tip-linha'>
                                        <span className='tip-nome'>Status:</span>
                                        <span className='tip-valor'>{statusHistoricoCliente.texto}</span>
                                    </div>
                                    <div className='tip-linha'>
                                        <span className='tip-nome'>Dias sem:</span>
                                        <span className='tip-valor'>
                                            {historicoCliente.loading
                                                ? 'Carregando...'
                                                : historicoCliente.ultimaCompra?.dias_da_ultima_compra ?? '-'}
                                        </span>
                                    </div>
                                    <div className='tip-linha'>
                                        <span className='tip-nome'>Última compra:</span>
                                        <span className='tip-valor'>
                                            {formatarDataHistoricoCliente(historicoCliente.ultimaCompra?.dta_emissao)}
                                        </span>
                                    </div>
                                    {historicoCliente.erro && (
                                        <div className='tip-linha'>
                                            <span className='tip-nome'>Histórico:</span>
                                            <span className='tip-valor'>Erro ao buscar</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <FaSearch className="icon" onClick={() => setOpenLovPessoas(true)} />
                        <LovClientes
                            isOpen={openLovPessoas}
                            setLovOpen={() => setOpenLovPessoas(!openLovPessoas)}
                            onSelect={(cli) => { atualizarCliente(cli); setRepresentante(null); setCodClienteDigitado(cli.cod_pessoa); }}
                        />
                        <FaEraser className="icon"
                            onClick={() => {
                                atualizarCliente(null);
                                setRepresentante(null);
                                setOperacao({ cod_oper: null, des_oper: null });
                                setCodClienteDigitado('');
                                setCodRepresentanteDigitado('');
                                setCodCondPgtoDigitado('');
                                setCodOperacaoDigitado('');
                                setObservacoes([]);
                                setObsEditando(null);
                                setOpenObsModal(false);
                            }}
                        />
                    </div>

                    {/* Representante */}
                    <label>Representante:</label>
                    <div className="field-group full">
                        <input type="text" className='input-cod' value={codRepresentanteDigitado}
                            onChange={(e) => setCodRepresentanteDigitado(e.target.value)}
                            onBlur={() => buscarRepresentantePorCodigo(codRepresentanteDigitado)}
                        />
                        <input type="text" className='input-desc' value={representante?.des_pessoa || ''} readOnly />
                        <FaSearch className="icon" onClick={() => { if (!cliente) { alert('Selecione um cliente primeiro'); return; } setOpenLovRepresentantes(true); }} />
                        <LovRepresentantes
                            isOpen={openLovRepresentantes}
                            setLovOpen={() => setOpenLovRepresentantes(!openLovRepresentantes)}
                            codPessoa={cliente?.cod_pessoa}
                            onSelect={(rep) => { setRepresentante(rep); setCodRepresentanteDigitado(rep.cod_pessoa_rep); }}
                        />
                        <FaEraser className="icon" onClick={() => { setRepresentante(null); setCodRepresentanteDigitado(''); }} />
                    </div>

                    {/* Operação */}
                    <label>Operação:</label>
                    <div className="field-group full">
                        <input type="text" className='input-cod' value={codOperacaoDigitado}
                            onChange={(e) => setCodOperacaoDigitado(e.target.value)}
                            onBlur={() => buscarOperacaoPorCodigo(codOperacaoDigitado)}
                        />
                        <input type="text" className='input-desc' value={operacao.des_oper || ''} readOnly />
                        <FaSearch className="icon" onClick={() => { if (!cliente) { alert('Selecione um cliente primeiro'); return; } setOpenLovOperacoes(true); }} />
                        <LovOperacoes
                            isOpen={openLovOperacoes}
                            setLovOpen={() => setOpenLovOperacoes(!openLovOperacoes)}
                            onSelect={(op) => { setOperacao({ cod_oper: op.cod_oper, des_oper: op.des_oper }); setCodOperacaoDigitado(op.cod_oper); }}
                        />
                        <FaEraser className="icon" onClick={() => { setOperacao({ cod_oper: null, des_oper: null }); setCodOperacaoDigitado(''); }} />
                    </div>

                    {/* Condição pagamento */}
                    <label>Cond. pgto.:</label>
                    <div className="field-group full" >
                        <input type="text" className='input-cod' value={codCondPgtoDigitado}
                            onChange={(e) => setCodCondPgtoDigitado(e.target.value)}
                            onBlur={() => buscarCondPgtoPorCodigo(codCondPgtoDigitado)}
                        />
                        <input type="text" className='input-desc' value={CondPgto.des_cond_pgto || ''} readOnly />
                        {possuiDadosFinanceiros && (
                            <div className="cliente-historico-info condicao-pmv-info">
                                <span
                                    className={`cliente-historico-sinaleira ${statusCreditoCliente.classe}`}
                                    aria-label={statusCreditoCliente.texto}
                                />
                                <div className="tooltip-info cliente-historico-tooltip condicao-pmv-tooltip">
                                    <strong>{statusCreditoCliente.texto}</strong>
                                    <div className="tip-linha">
                                        <span className="tip-nome">Prazo médio de pagamento:</span>
                                        <span className="tip-valor">{prazoMedioVenda !== null ? `${prazoMedioVenda.toLocaleString('pt-BR')} dias` : '-'}</span>
                                    </div>
                                    <div className="tip-linha">
                                        <span className="tip-nome">Período:</span>
                                        <span className="tip-valor">180 dias</span>
                                    </div>
                                    <div className="tip-linha">
                                        <span className="tip-nome">Limite mensal:</span>
                                        <span className="tip-valor">{creditoCliente.limiteMensal !== null ? format.moeda(creditoCliente.limiteMensal) : '-'}</span>
                                    </div>
                                    <div className="tip-linha">
                                        <span className="tip-nome">Consumido:</span>
                                        <span className={`tip-valor ${limiteCreditoRuim ? 'credito-valor-ruim' : 'credito-valor-bom'}`}>
                                            {creditoCliente.atingido !== null ? format.percentual(creditoCliente.atingido) : '-'}
                                        </span>
                                    </div>
                                    <div className="tip-linha">
                                        <span className="tip-nome">Títulos vencidos:</span>
                                        <span className={`tip-valor ${possuiTitulosVencidos ? 'credito-valor-ruim' : 'credito-valor-bom'}`}>
                                            {creditoCliente.titulosVencidos !== null ? format.numero(creditoCliente.titulosVencidos) : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <FaSearch className="icon" onClick={() => { if (!cliente) { alert('Selecione um cliente primeiro'); return; } setOpenLovCondPgto(true); }} />
                        <LovCondPgto
                            isOpen={openLovCondPgto}
                            setLovOpen={() => setOpenLovCondPgto(!openLovCondPgto)}
                            onSelect={(cond) => {
                                setCondPgto({ cod_cond_pgto: cond.cod_cond_pgto, des_cond_pgto: cond.des_cond_pgto });
                                setCodCondPgtoDigitado(cond.cod_cond_pgto);
                            }}
                        />
                        <FaEraser className="icon" onClick={() => { setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null }); setCodCondPgtoDigitado(''); }} />
                    </div>
                <div></div>
                </div>
            </div>

            <div className="item-card">
                <h2 className="pedido-title">Itens do Pedido</h2>
                <div className="itens-table-wrapper">
                    <div className="tabelas-itens-layout">
                        <section className="tabela-itens-bloco tabela-itens-principal">
                            <div className="tabela-bloco-cabecalho">
                                <h3>Itens</h3>
                                <div className="item-selection-menu">
                                    <button type="button" className="item-selection-trigger" onClick={() => setMenuSelecaoItensOpen(prev => prev === 'todos' ? null : 'todos')}>Selecionar</button>
                                    {menuSelecaoItensOpen === 'todos' && (
                                        <div className="item-selection-dropdown">
                                            <button type="button" onClick={() => selecionarTodosItens(true)}>Marcar todos</button>
                                            <button type="button" onClick={() => selecionarTodosItens(false)}>Desmarcar todos</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <table className="itens-grid itens-grid-selecao">
                                <thead><tr><th>Sel.</th><th>Seq</th><th>Cód.</th><th>Item</th><th>Princ. ativo</th><th>Marca</th><th>Qtd.</th><th></th></tr></thead>
                                <tbody>
                                    {itensAgrupados.map(grupo => {
                                        const itemBase = grupo[201] || grupo[203];
                                        const possuiAcordo = [grupo[201], grupo[203]].some(item => item && itemPossuiAcordo(item));
                                        return (
                                            <tr key={grupo.grupoId} className={possuiAcordo ? 'item-row-acordo' : ''}>
                                                <td><input type="checkbox" checked={Boolean(itemBase.selecionado)} onChange={(e) => handleCheckboxChange(grupo.grupoId, e.target.checked)} /></td>
                                                <td>{itemBase.seq}</td>
                                                <td>{itemBase.cod_item}{possuiAcordo && <span className="item-acordo-marca">©</span>}</td>
                                                <td><span className="item-cell-text">{itemBase.descricao}</span></td>
                                                <td><span className="item-cell-text">{itemBase.principiosAtivos || '-'}</span></td>
                                                <td>{itemBase.marca || '-'}</td>
                                                <td><input className="item-table-input" data-seq={itemBase.seq} value={itemBase.quantidade} onChange={(e) => handleQuantidadeChange(grupo.grupoId, e.target.value)} onBlur={() => validarMultiplo(grupo.grupoId)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} /></td>
                                                <td><button type="button" className="btn-remover-item" onClick={() => removerItem(grupo.grupoId)} title="Remover item"><FaTrash /></button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </section>

                        {[{ unidade: 201, titulo: 'Unidade 201 (Matriz)' }, { unidade: 203, titulo: 'Unidade 203 (Filial)' }].map(config => (
                            <section className="tabela-itens-bloco tabela-unidade-resumo" key={config.unidade}>
                                <div className="tabela-bloco-cabecalho"><h3>{config.titulo}</h3><span>Dados da unidade</span></div>
                                <table className="itens-grid itens-grid-unidade">
                                    <thead><tr><th>Estoque</th><th>Vlr Lista</th><th>Vlr Total</th><th>Sobra %</th><th>Info</th></tr></thead>
                                    <tbody>
                                        {itensAgrupados.map(grupo => {
                                            const item = grupo[config.unidade];
                                            const possuiAcordo = item && itemPossuiAcordo(item);
                                            if (!item) return <tr key={grupo.grupoId}><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>;
                                            const valores = calcularValoresItem(item);
                                            return (
                                                <tr key={grupo.grupoId} className={possuiAcordo ? 'item-row-acordo' : ''}>
                                                    <td>{item.estoque}</td>
                                                    <td><input className="item-table-input item-table-money" value={item.valorLista} onChange={(e) => handleValorListaChange(item.seq, maskMoneyBR(e.target.value))} /></td>
                                                    <td>{format.moeda(valores.valorVendaTotal ?? 0)}</td>
                                                    <td style={{ color: valores.sobraReal >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>{format.percentual(valores.sobraPercentual ?? 0)}</td>
                                                    <td className="info-cell">{renderInfoItem(item, valores)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </section>
                        ))}
                    </div>
                </div>
                {false && (
                <div className="tabelas-container">
                    {/* Tabela Unidade 201 */}
                    <div className="tabela-unidade">
                        <h3>Unidade 201 (Matriz)</h3>
                        <div className="item-selection-actions">
                            <div className="item-selection-menu">
                                <button
                                    type="button"
                                    className="item-selection-trigger"
                                    onClick={() => setMenuSelecaoItensOpen(prev => prev === 201 ? null : 201)}
                                >
                                    Selecionar
                                </button>
                                {menuSelecaoItensOpen === 201 && (
                                    <div className="item-selection-dropdown">
                                        <button type="button" onClick={() => selecionarItensPorUnidade(201, true)}>Marcar todos</button>
                                        <button type="button" onClick={() => selecionarItensPorUnidade(201, false)}>Desmarcar todos</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <table className="itens-grid">
                            <thead>
                                <tr>
                                    <th>Sel.</th>
                                    <th>Seq</th>
                                    <th>Cód.</th>
                                    <th>Item</th>
                                    <th>Princ. ativo</th>
                                    <th>Estoque</th>
                                    <th>Qtd.</th>
                                    <th>Vlr Lista</th>
                                    <th>Vlr Total</th>
                                    <th>Custo Méd.</th>
                                    <th>Sobra %</th>
                                    <th>Info</th>
                                    <th>
                                        <button
                                            type="button"
                                            className="btn-limpar-itens"
                                            onClick={() => removerItensPorUnidade(201)}
                                            title="Remover itens da unidade 201"
                                            disabled={!itens201.length}
                                        >
                                            <FaTrash />
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {itens201.map(item => {
                                    const valores = calcularValoresItem(item);
                                    const freteItem = freteSelecionado[item.unidade];
                                    const possuiAcordo = itemPossuiAcordo(item);
                                    return (
                                        <tr key={item.seq} className={possuiAcordo ? 'item-row-acordo' : ''}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={item.selecionado}
                                                    onChange={(e) => handleCheckboxChange(item.seq, e.target.checked)}
                                                />
                                            </td>
                                            <td>{item.seq}</td>
                                            <td>
                                                {item.cod_item}
                                                {possuiAcordo && <span className="item-acordo-marca">©</span>}
                                            </td>
                                            <td>{item.descricao}</td>
                                            <td>{item.principiosAtivos || '-'}</td>
                                            <td>{item.estoque}</td>
                                            <td>
                                                <input
                                                    className="item-table-input"
                                                    value={item.quantidade}
                                                    onChange={(e) => handleQuantidadeChange(item.seq, e.target.value)}
                                                    onBlur={() => validarMultiplo(item.seq)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.target.blur();
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    className="item-table-input item-table-money"
                                                    value={item.valorLista}
                                                    onChange={(e) => {
                                                        const v = maskMoneyBR(e.target.value);
                                                        handleValorListaChange(item.seq, v);
                                                    }}
                                                />
                                            </td>
                                            <td>{format.moeda(valores.valorVendaTotal ?? 0)}</td>
                                            <td>{format.moeda(item.vlrMedio ?? 0)}</td>
                                            <td style={{ color: valores.sobraReal >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                                                {format.percentual(valores.sobraPercentual ?? 0)}
                                            </td>
                                            <td className="info-cell">
                                                <IoInformationOutline className="icon info-icon" />
                                                <div className="tooltip-info">
                                                    <strong>Detalhes do Item</strong>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>ICMS:</span>    
                                                        <span className='tip-valor'>{format.moeda(valores.icms ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perIcms)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>ICMS ST:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.st ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perSubstTrib)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>DIFAL:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.difal ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perDifal)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>PIS:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.pis ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perPis)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>COFINS:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.cofins ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perCofins)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>IPI:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.ipi ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perIpi)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>FCP:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.fcp ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perFcp)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>ICMS deson (Funrural):</span>
                                                        <span className='tip-valor'>{format.moeda(valores.valorFunrural ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perFunrural)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Frete rateado:</span> 
                                                        <span className='tip-valor'>{format.moeda(item.valorFrete ?? 0)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Sobra:</span>
                                                        <span className='tip-valor'>{format.moeda(valores.sobraReal ?? 0)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Transportadora:</span>
                                                        <span className='tip-valor'>{freteItem?.nome || '-'}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Prazo:</span>
                                                        <span className='tip-valor'>{freteItem ? `${freteItem.prazo} dias` : '-'}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Última compra:</span>
                                                        <span className='tip-valor'>{formatarDataUltimaCompraItem(item)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Ticket médio:</span>
                                                        <span className='tip-valor'>{item.ticktMedio != null ? format.moeda(item.ticktMedio) : '-'}</span>
                                                    </div>
                                                    {possuiAcordo && (
                                                        <div className="tooltip-acordo">
                                                            <strong>Item possui acordo comercial</strong>
                                                            <div className='tip-linha'>
                                                                <span className='tip-nome'>Pedidos:</span>
                                                                <span className='tip-valor'>{getPedidosAcordoTexto(item.acordosComerciais)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-remover-item"
                                                    onClick={() => removerItem(item.seq)}
                                                    title="Remover item"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Tabela Unidade 203 */}
                    <div className="tabela-unidade">
                        <h3>Unidade 203 (Filial)</h3>
                        <div className="item-selection-actions">
                            <div className="item-selection-menu">
                                <button
                                    type="button"
                                    className="item-selection-trigger"
                                    onClick={() => setMenuSelecaoItensOpen(prev => prev === 203 ? null : 203)}
                                >
                                    Selecionar
                                </button>
                                {menuSelecaoItensOpen === 203 && (
                                    <div className="item-selection-dropdown">
                                        <button type="button" onClick={() => selecionarItensPorUnidade(203, true)}>Marcar todos</button>
                                        <button type="button" onClick={() => selecionarItensPorUnidade(203, false)}>Desmarcar todos</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <table className="itens-grid">
                            <thead>
                                <tr>
                                    <th>Sel.</th>
                                    <th>Seq</th>
                                    <th>Cód.</th>
                                    <th>Item</th>
                                    <th>Princ. ativo</th>
                                    <th>Estoque</th>
                                    <th>Qtd.</th>
                                    <th>Vlr Lista</th>
                                    <th>Vlr Total</th>
                                    <th>Custo Méd.</th>
                                    <th>Sobra %</th>
                                    <th>Info</th>
                                    <th>
                                        <button
                                            type="button"
                                            className="btn-limpar-itens"
                                            onClick={() => removerItensPorUnidade(203)}
                                            title="Remover itens da unidade 203"
                                            disabled={!itens203.length}
                                        >
                                            <FaTrash />
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {itens203.map(item => {
                                    const valores = calcularValoresItem(item);
                                    const freteItem = freteSelecionado[item.unidade];
                                    const possuiAcordo = itemPossuiAcordo(item);
                                    return (
                                        <tr key={item.seq} className={possuiAcordo ? 'item-row-acordo' : ''}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={item.selecionado}
                                                    onChange={(e) => handleCheckboxChange(item.seq, e.target.checked)}
                                                />
                                            </td>
                                            <td>{item.seq}</td>
                                            <td>
                                                {item.cod_item}
                                                {possuiAcordo && <span className="item-acordo-marca">©</span>}
                                            </td>
                                            <td>{item.descricao}</td>
                                            <td>{item.principiosAtivos || '-'}</td>
                                            <td>{item.estoque}</td>
                                            <td>
                                                <input
                                                    className="item-table-input"
                                                    value={item.quantidade}
                                                    onChange={(e) => handleQuantidadeChange(item.seq, e.target.value)}
                                                    onBlur={() => validarMultiplo(item.seq)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.target.blur();
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    className="item-table-input item-table-money"
                                                    value={item.valorLista}
                                                    onChange={(e) => {
                                                        const v = maskMoneyBR(e.target.value);
                                                        handleValorListaChange(item.seq, v);
                                                    }}
                                                />
                                            </td>
                                            <td>{format.moeda(valores.valorVendaTotal ?? 0)}</td>
                                            <td>{format.moeda(item.vlrMedio ?? 0)}</td>
                                            <td style={{ color: valores.sobraReal >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                                                {format.percentual(valores.sobraPercentual ?? 0)}
                                            </td>
                                            <td className="info-cell">
                                                <IoInformationOutline className="icon info-icon" />
                                                <div className="tooltip-info">
                                                    <strong>Detalhes do Item</strong>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>ICMS:</span>    
                                                        <span className='tip-valor'>{format.moeda(valores.icms ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perIcms)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>ICMS ST:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.st ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perSubstTrib)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>DIFAL:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.difal ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perDifal)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>PIS:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.pis ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perPis)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>COFINS:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.cofins ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perCofins)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>IPI:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.ipi ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perIpi)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>FCP:</span> 
                                                        <span className='tip-valor'>{format.moeda(valores.fcp ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perFcp)}</span> 
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>ICMS deson (Funrural):</span>
                                                        <span className='tip-valor'>{format.moeda(valores.valorFunrural ?? 0)}</span>
                                                        <span className='tip-percent'>{format.percentual(item.impostos?.perFunrural)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Frete rateado:</span> 
                                                        <span className='tip-valor'>{format.moeda(item.valorFrete ?? 0)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Sobra:</span>
                                                        <span className='tip-valor'>{format.moeda(valores.sobraReal ?? 0)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Transportadora:</span>
                                                        <span className='tip-valor'>{freteItem?.nome || '-'}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Prazo:</span>
                                                        <span className='tip-valor'>{freteItem ? `${freteItem.prazo} dias` : '-'}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Última compra:</span>
                                                        <span className='tip-valor'>{formatarDataUltimaCompraItem(item)}</span>
                                                    </div>
                                                    <div className='tip-linha'>
                                                        <span className='tip-nome'>Ticket médio:</span>
                                                        <span className='tip-valor'>{item.ticktMedio != null ? format.moeda(item.ticktMedio) : '-'}</span>
                                                    </div>
                                                    {possuiAcordo && (
                                                        <div className="tooltip-acordo">
                                                            <strong>Item possui acordo comercial</strong>
                                                            <div className='tip-linha'>
                                                                <span className='tip-nome'>Pedidos:</span>
                                                                <span className='tip-valor'>{getPedidosAcordoTexto(item.acordosComerciais)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-remover-item"
                                                    onClick={() => removerItem(item.seq)}
                                                    title="Remover item"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                <div className="item-card-container">
                    <button className="btn-adicionar-item" onClick={() => 
                        {
                            if(!cliente){
                                setModalErro({
                                    aberto: true,
                                    mensagem: `Selecione um cliente antes de adicionar item!`
                                });
                                return;
                            }
                            if(!operacao.cod_oper){
                                setModalErro({
                                    aberto: true,
                                    mensagem: `Selecione uma operação antes de adicionar item!`
                                });
                                return;
                            }
                            if(!CondPgto.cod_cond_pgto){
                                setModalErro({
                                    aberto: true,
                                    mensagem: `Selecione uma condição de pagamento antes de adicionar item!`
                                });
                                return;
                            }
                            setOpenLovItens(true)}   
                        }>+ Item</button>
                    <button className="btn-cotar-simfrete" onClick={cotar}>Cotar SimFrete</button>
                </div>

                <LovItens
                    isOpen={openLovItens}
                    setLovOpen={() => setOpenLovItens(!openLovItens)}
                    itensExistentes={itensPedido}
                    onSelect={(item) => adicionarItem(item)}
                />
                <LoadingOverlay isOpen={loading || loadingDadosCliente} />

            </div>
            <ModalErro
                aberto={modalErro.aberto}
                mensagem={modalErro.mensagem}
                onClose={() => {
                    setModalErro({ aberto: false, mensagem: '', seqItem: null });
                    setTimeout(() => {
                        if (modalErro.focusSelector) {
                            const input = document.querySelector(modalErro.focusSelector);
                            input?.focus();
                            return;
                        }
                        if (modalErro.seqItem) {
                            const input = document.querySelector(`input[data-seq="${modalErro.seqItem}"]`);
                            input?.focus();
                        }
                    }, 0);
                }}
            />
            <ModalErro
                aberto={modalSucesso.aberto}
                mensagem={modalSucesso.mensagem}
                onClose={() => {
                    setModalSucesso({ aberto: false, mensagem: '' });
                    limparTelaPedidoVenda();
                }}
            />
            <div className="obs-card">
               <h2 className="pedido-title">Observações</h2>

                <table className="obs-grid">
                    <thead>
                        <tr>
                            <th>Observação</th>
                            <th>Pedido</th>
                            <th>Nota fiscal</th>
                            <th>Registro de saídas</th>
                            <th>Contas a receber</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {observacoes.map(obs => (
                            <tr key={obs.num_seq} onClick={() => editarObs(obs)}>

                                <td className='obs-grid-desc'>{obs.descricao}</td>

                                <td><input type="checkbox"checked={obs.pedido} disabled/></td>
                                <td><input type="checkbox"checked={obs.nota} disabled/></td>
                                <td><input type="checkbox"checked={obs.registro} disabled/></td>
                                <td><input type="checkbox"checked={obs.financeiro} disabled/></td>

                                <td onClick={(e) => e.stopPropagation()}>
                                    <FaTrash onClick={() => removerObs(obs.num_seq)} />
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
                <LovObservacao
                    isOpen={openObsModal}
                    onClose={() => setOpenObsModal(false)}
                    onSave={salvarObs}
                    obs={obsEditando}
                />

                <div className="obs-footer">
                    <button className="btn-adicionar" onClick={() => 
                        {
                            if(!cliente){
                                setModalErro({
                                    aberto: true,
                                    mensagem: `Selecione um cliente antes de adicionar uma observação!`
                                });
                                return;
                            }
                            if(!operacao.cod_oper){
                                setModalErro({
                                    aberto: true,
                                    mensagem: `Selecione uma operação antes de adicionar uma observação!`
                                });
                                return;
                            }
                            if(!CondPgto.cod_cond_pgto){
                                setModalErro({
                                    aberto: true,
                                    mensagem: `Selecione uma condição de pagamento antes de adicionar uma observação!`
                                });
                                return;
                            }
                        abrirNovaObs()}   
                        }>+ Adicionar</button>
                </div>

            </div>
            <div className="oc-card">
                <h2 className="pedido-title">Ordem de Compra</h2>
                <label>Ordem de Compra: </label>
                <input
                    type="text"
                    className='input-desc'
                    value={ordemCompra}
                    maxLength={20}
                    data-field="ordem-compra"
                    onChange={(e) => setOrdemCompra(e.target.value)}
                    onBlur={validarOrdemCompra}
                />
            </div>
            <div className="triang-card">
                <h2 className="pedido-title">Triangulação</h2>
                <div className="form-grid">
                    <label>Cliente:</label>
                    <div className="field-group full">
                        <input type="text" className='input-cod'
                            value={codClienteTriangulacaoDigitado}
                            onChange={(e) => { setCodClienteTriangulacaoDigitado(e.target.value); }}
                            onBlur={buscarClienteTriangulacaoPorCodigo}
                            />
                        <input type="text" className='input-desc' value={clienteTriangulacao?.des_pessoa || ''} readOnly />
                        <FaSearch className="icon" onClick={() => setOpenLovTriangulacao(true)} />
                        <LovClientes
                            isOpen={openLovTriangulacao}
                            setLovOpen={() => setOpenLovTriangulacao(!openLovTriangulacao)}
                            onSelect={(cli) => {
                                setClienteTriangulacao(cli);
                                setCodClienteTriangulacaoDigitado(cli.cod_pessoa);
                            }}
                            />
                        <FaEraser className="icon"
                            onClick={() => {
                                setClienteTriangulacao(null);
                                setCodClienteTriangulacaoDigitado('');
                            }}
                            />
                    </div>
                    <label>Operação:</label>
                    <div className="field-group full">
                        <input
                            type="text"
                            className='input-cod'
                            value={codOperacaoTriangulacaoDigitado}
                            onChange={(e) => setCodOperacaoTriangulacaoDigitado(e.target.value)}
                            onBlur={buscarOperacaoTriangulacaoPorCodigo}
                        />
                        <input
                            type="text"
                            className='input-desc'
                            value={operacaoTriangulacao.des_oper || ''}
                            readOnly
                        />
                        <FaSearch className="icon" onClick={() => setOpenLovOperacoesTriangulacao(true)} />
                        <LovOperacoes
                            isOpen={openLovOperacoesTriangulacao}
                            setLovOpen={() => setOpenLovOperacoesTriangulacao(!openLovOperacoesTriangulacao)}
                            onSelect={(op) => {
                                setOperacaoTriangulacao({ cod_oper: op.cod_oper, des_oper: op.des_oper });
                                setCodOperacaoTriangulacaoDigitado(op.cod_oper);
                            }}
                        />
                        <FaEraser
                            className="icon"
                            onClick={() => {
                                setOperacaoTriangulacao({ cod_oper: null, des_oper: null });
                                setCodOperacaoTriangulacaoDigitado('');
                            }}
                        />
                    </div>
                </div>
            </div>
            <div className="endereco-card">
                <h2 className="pedido-title">Endereço de Entrega</h2>
                <div className="endereco-actions">
                    <button type="button" className="endereco-tab active" onClick={carregarEnderecoPadraoCliente}>PADRÃO</button>
                    <button type="button" className="endereco-tab" onClick={abrirLovEnderecos}>ENDEREÇOS</button>
                </div>
                <div className="endereco-grid">
                    <label>CEP:</label>
                    <div className="endereco-row endereco-row-cep">
                        <input
                            type="text"
                            className="endereco-input endereco-input-small"
                            value={codCepDigitado}
                            onChange={(e) => setCodCepDigitado(e.target.value)}
                            onBlur={buscarCepPorCodigo}
                        />
                        <FaSearch className="info-icon" onClick={() => setOpenLovCep(true)}/>
                        <LovCep
                            isOpen={openLovCep}
                            setLovOpen={() => setOpenLovCep(!openLovCep)}
                            codCep={codCepDigitado}
                            onSelect={aplicarCep}
                        />
                        <LovEnderecos
                            isOpen={openLovEnderecos}
                            setLovOpen={setOpenLovEnderecos}
                            codPessoa={getCodigoPessoaCliente()}
                            onSelect={aplicarEnderecoEntrega}
                        />
                    </div>
                    <label>UF:</label>
                    <div className="endereco-row endereco-row-duplo">
                        <input
                            type="text"
                            className="endereco-input endereco-input-uf"
                            value={codUfDigitado}
                            onChange={(e) => setCodUfDigitado(e.target.value)}
                            onBlur={buscarUfPorCodigo}
                        />
                        <input type="text" className="endereco-input endereco-input-wide" value={getDescricaoUf(uf)} readOnly />
                        <div className="endereco-row-icons">
                            <FaSearch className="icon" onClick={() => setOpenLovUf(true)} />
                            <LovUf
                                isOpen={openLovUf}
                                setLovOpen={() => setOpenLovUf(!openLovUf)}
                                codUf={codUfDigitado}
                                onSelect={(ufSelecionada) => {
                                    setUf(ufSelecionada);
                                    setCodUfDigitado(ufSelecionada.cod_uf);
                                }}
                            />
                            <FaEraser className="info-icon" onClick={limparEnderecoCep} />
                        </div>
                    </div>
                    <label>Cidade:</label>
                    <div className="endereco-row endereco-row-duplo">
                        <input type="text" className="endereco-input endereco-input-city-code" value={codCidadeDigitado} onChange={(e) => setCodCidadeDigitado(e.target.value)} onBlur={buscarCidadePorCodigo} />
                        <input type="text" className="endereco-input endereco-input-wide" value={cidade?.des_cidade || ''} readOnly />
                        <div className="endereco-row-icons">
                            <FaSearch className="icon" onClick={() => setOpenLovCidades(true)} />
                            <LovCidades
                                isOpen={openLovCidades}
                                setLovOpen={() => setOpenLovCidades(!openLovCidades)}
                                codIbge={codCidadeDigitado}
                                onSelect={async (cid) => {
                                    setCidade(cid);
                                    setCodCidadeDigitado(cid.cod_ibge);
                                    await carregarUfPorCodigo(cid.cod_uf);
                                }}
                            />
                            <FaEraser className="info-icon" onClick={limparEnderecoCep} />
                        </div>
                    </div>
                    <label>Tipo:</label>
                    <div className="endereco-row">
                        <select
                            className="endereco-input endereco-select"
                            value={tipoLogradouroSelecionado}
                            onChange={(e) => setTipoLogradouroSelecionado(e.target.value)}
                        >
                            <option value="">Selecione</option>
                            {tiposLogradouro.map((tipo) => (
                                <option key={tipo.cod_tipo} value={tipo.des_tipo}>
                                    {tipo.des_tipo}
                                </option>
                            ))}
                        </select>
                    </div>
                    <label>Logradouro:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-logradouro"
                            value={logradouroDigitado}
                            onChange={(e) => setLogradouroDigitado(e.target.value)}
                        />
                    </div>
                    <label>Número:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-small"
                            value={numeroEnderecoDigitado}
                            onChange={(e) => setNumeroEnderecoDigitado(e.target.value)}
                        />
                    </div>
                    <label>Complemento:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-logradouro"
                            value={complementoEnderecoDigitado}
                            onChange={(e) => setComplementoEnderecoDigitado(e.target.value)}
                        />
                    </div>
                    <label>Bairro:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-bairro"
                            value={bairroDigitado}
                            onChange={(e) => setBairroDigitado(e.target.value)}
                        />
                    </div>
                    <label>Referência:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-logradouro"
                            value={referenciaEnderecoDigitado}
                            onChange={(e) => setReferenciaEnderecoDigitado(e.target.value)}
                        />
                    </div>
                    <label>Data da Carga:</label>
                    <div className="endereco-row endereco-row-data">
                        <input
                            type="text"
                            className="endereco-input endereco-input-date"
                            value={dataCargaDigitada}
                            onChange={(e) => setDataCargaDigitada(e.target.value)}
                        />
                        <FaCalendarAlt className="info-icon" />
                    </div>
                </div>
            </div>
            <div className="integracao-card">
                <div className="obs-footer">
                    <button type="button" className="btn-adicionar" onClick={abrirSelecaoUnidadesPedido}>
                        Enviar pedido ao ERP
                    </button>
                </div>
            </div>
            <LovUnidadesPedido
                isOpen={openLovUnidadesPedido}
                onClose={() => setOpenLovUnidadesPedido(false)}
                onConfirm={finalizarPedidoErp}
            />
        </div>
    );
}
