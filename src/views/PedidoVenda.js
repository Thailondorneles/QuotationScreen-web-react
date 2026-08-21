import '../style/pedidoVenda.css';
import { FaCalendarAlt, FaEdit, FaEraser, FaSearch, FaTrash, FaHourglassHalf } from "react-icons/fa";
import { useState, useEffect, useMemo, useRef } from 'react';
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
import { getClienteByFilter, getAllClientesCached, getClienteDetalhado, getClientesComentarios, getClientesHistorico, getClientesUltimasCompras, agruparUltimasComprasPorItem } from '../services/clientes.js';
import { getCidadesByFilter } from '../services/cidades.js';
import { getUfByFilter } from '../services/uf.js';
import { getTipLogradouro } from '../services/tipLogradouro.js';
import { getCondPgtoByFilter } from '../services/condPgto.js';
import { getOperacoesByFilter } from '../services/operacoes.js';
import { IoInformationOutline } from "react-icons/io5";
import { getImpostosCached } from '../services/impostos.js';
import { ModalErro } from '../components/ModalErro.js';
import { getListaPreco } from '../services/listaPreco.js';
import { getItensAcordos, getItensClassificacao, getItensDetalhados, getItemUltimaCompra, getItensLotesCached } from '../services/itens.js';
import { cotarSimFrete } from '../config/simFreteService.js';
import { format } from '../utils/format.js';
import { maskMoneyBR } from '../utils/maskMoney.js';
import LoadingOverlay from '../components/LoadingOverlay.js';
import { LovObservacao } from '../components/LovObservacao.js';
import { enviarPedidoErp } from '../services/pedidosErp.js';
import { LovUnidadesPedido } from '../components/LovUnidadesPedido.js';
import { ModalConfirmacao } from '../components/ModalConfirmacao.js';
import { ModalEmitirProposta } from '../components/ModalEmitirProposta.js';
import { criarPropostasPorUnidade, validarDadosProposta } from '../services/proposta/propostaDataService.js';
import { exportarPropostas } from '../services/proposta/propostaService.js';


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
    const [clienteDetalhado, setClienteDetalhado] = useState(null);
    const [clienteTriangulacao, setClienteTriangulacao] = useState(null);
    const [representante, setRepresentante] = useState(null);
    const [operacao, setOperacao] = useState({ cod_oper: null, des_oper: null });
    const [uf, setUf] = useState(null);
    const [cidade, setCidade] = useState(null);
    const [operacaoTriangulacao, setOperacaoTriangulacao] = useState({ cod_oper: null, des_oper: null });
    const [CondPgto, setCondPgto] = useState({ cod_cond_pgto: null, des_cond_pgto: null });
    const [prazoMedioVenda, setPrazoMedioVenda] = useState(null);
    const [clienteConsumidor, setClienteConsumidor] = useState(false);
    const [modalidadeIntegracao, setModalidadeIntegracao] = useState(2);
    const [menuModalidadeIntegracaoOpen, setMenuModalidadeIntegracaoOpen] = useState(false);
    const [opcaoFrete, setOpcaoFrete] = useState('CIF');
    const [menuOpcaoFreteOpen, setMenuOpcaoFreteOpen] = useState(false);
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
    const [lotesProximosMap, setLotesProximosMap] = useState({});
    const [modalErro, setModalErro] = useState({
        aberto: false,
        mensagem: '',
        seqItem: null,
        focusSelector: null
    });
    const [modalSucesso, setModalSucesso] = useState({
        aberto: false,
        mensagem: '',
        limparAoFechar: false
    });
    const [modalConfirmacaoErp, setModalConfirmacaoErp] = useState({
        aberto: false,
        mensagem: '',
        unidadesSelecionadas: [],
        situacoesPorUnidade: {}
    });
    const [modalEmitirProposta, setModalEmitirProposta] = useState(false);
    const [gerandoProposta, setGerandoProposta] = useState(false);
    const nextId = useRef(1);
    const nextNumItem = useRef(1);
    const [freteSelecionado, setFreteSelecionado] = useState({
        201: null,
        203: null
    });
    const [cotacoesFrete, setCotacoesFrete] = useState({ 201: [], 203: [] });
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
    const [ordenacaoItens, setOrdenacaoItens] = useState({ coluna: null, direcao: null });
    const [openLovUnidadesPedido, setOpenLovUnidadesPedido] = useState(false);
    const [ultimasComprasClienteMap, setUltimasComprasClienteMap] = useState({});
    const dadosClienteCache = useRef(new Map());
    const representanteClienteCache = useRef(new Map());
    const historicoClienteCache = useRef(new Map());
    const acordosItemCache = useRef(new Map());
    const ultimaCompraItemCache = useRef(new Map());
    const ultimasComprasClienteCache = useRef(new Map());
    const requisicaoUltimasComprasCliente = useRef(new Map());
    const listaPrecoInfoCache = useRef(new Map());
    const classificacoesItemCache = useRef(new Map());
    const recalculoClienteId = useRef(0);

    async function mapComConcorrencia(itens, limite, processar) {
        const resultados = Array(itens.length);
        let proximoIndice = 0;

        async function worker() {
            while (proximoIndice < itens.length) {
                const indice = proximoIndice++;
                try {
                    resultados[indice] = {
                        status: 'fulfilled',
                        value: await processar(itens[indice])
                    };
                } catch (reason) {
                    resultados[indice] = { status: 'rejected', reason };
                }
            }
        }

        await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, worker));
        return resultados;
    }

    const codigosItensPedido = useMemo(
        () => [...new Set(itensPedido.map(item => String(item.cod_item)).filter(Boolean))].sort().join(','),
        [itensPedido]
    );

    useEffect(() => {
        setItensPedido(prev => prev.map(item => ({
            ...item,
            ultimaCompraItemDasUltimasCompras: ultimasComprasClienteMap[item.cod_item] || null
        })));
    }, [ultimasComprasClienteMap]);

    useEffect(() => {
        getItensLotesCached()
            .then(itens => setLotesProximosMap((itens || []).reduce((acc, item) => {
                const codItem = String(item.cod_item ?? '');
                if (codItem) acc[codItem] = item;
                return acc;
            }, {})))
            .catch(() => setLotesProximosMap({}));
    }, []);

    useEffect(() => {
        const codItens = codigosItensPedido ? codigosItensPedido.split(',') : [];
        const codItensSemCache = codItens.filter(codItem => !classificacoesItemCache.current.has(codItem));

        if (!codItensSemCache.length) return;

        let ativo = true;

        getItensClassificacao({ codItens: codItensSemCache })
            .then(response => {
                if (!ativo) return;

                (response.data.items || []).forEach(item => {
                    classificacoesItemCache.current.set(String(item.cod_item), item.des_geral ?? null);
                });

                codItensSemCache.forEach(codItem => {
                    if (!classificacoesItemCache.current.has(codItem)) {
                        classificacoesItemCache.current.set(codItem, null);
                    }
                });

                setItensPedido(prev => prev.map(item => {
                    const classificacao = classificacoesItemCache.current.get(String(item.cod_item)) ?? null;
                    return item.classificacao === classificacao ? item : { ...item, classificacao };
                }));
            })
            .catch(() => {});

        return () => { ativo = false; };
    }, [codigosItensPedido]);

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

    function getCodigoTipoLogradouro(desTipo) {
        const descricao = String(desTipo ?? '').trim().toUpperCase();
        const tipo = tiposLogradouro.find(item =>
            String(item.des_tipo ?? '').trim().toUpperCase() === descricao
        );

        return tipo?.cod_tipo ?? null;
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
        setClienteDetalhado(null);
        setClienteTriangulacao(null);
        setRepresentante(null);
        setOperacao({ cod_oper: null, des_oper: null });
        setOperacaoTriangulacao({ cod_oper: null, des_oper: null });
        setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
        setPrazoMedioVenda(null);
        setClienteConsumidor(false);
        setModalidadeIntegracao(2);
        setMenuModalidadeIntegracaoOpen(false);
        setOpcaoFrete('CIF');
        setMenuOpcaoFreteOpen(false);
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
        setModalEmitirProposta(false);
        setGerandoProposta(false);
        setModalErro({
            aberto: false,
            mensagem: '',
            seqItem: null,
            focusSelector: null
        });
        setModalSucesso({
            aberto: false,
            mensagem: '',
            limparAoFechar: false
        });
        nextId.current = 1;
        nextNumItem.current = 1;
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
            setClienteDetalhado(null);
            setPrazoMedioVenda(null);
            setClienteConsumidor(false);
            setCreditoCliente({ atingido: null, limiteMensal: null, titulosVencidos: null });
            setFreteSelecionado({ 201: null, 203: null });
            setUltimasComprasClienteMap({});
        }

        setCliente(cli);

        if (mudouCliente && codigoNovo) {
            (async () => {
                try {

                    if (ultimasComprasClienteCache.current.has(codigoNovo)) {
                        if (idRecalculo === recalculoClienteId.current) {
                            setUltimasComprasClienteMap(ultimasComprasClienteCache.current.get(codigoNovo));
                        }
                        return;
                    }

                    if (requisicaoUltimasComprasCliente.current.has(codigoNovo)) {
                        const result = await requisicaoUltimasComprasCliente.current.get(codigoNovo);
                        if (idRecalculo === recalculoClienteId.current) {
                            setUltimasComprasClienteMap(result);
                        }
                        return;
                    }

                    const promise = getClientesUltimasCompras({ codCliente: codigoNovo })
                        .then(response => {
                            const items = response.data?.items || [];
                            const ultimasComprasAgrupadas = agruparUltimasComprasPorItem(items);
                            const mapPorItem = {};
                            Object.keys(ultimasComprasAgrupadas).forEach(codItem => {
                                const compras = ultimasComprasAgrupadas[codItem];
                                if (Array.isArray(compras) && compras.length > 0) {
                                    mapPorItem[codItem] = compras;
                                }
                            });

                            ultimasComprasClienteCache.current.set(codigoNovo, mapPorItem);
                            requisicaoUltimasComprasCliente.current.delete(codigoNovo);
                            return mapPorItem;
                        })
                        .catch(() => {
                            requisicaoUltimasComprasCliente.current.delete(codigoNovo);
                            return {};
                        });

                    requisicaoUltimasComprasCliente.current.set(codigoNovo, promise);
                    const result = await promise;
                    if (idRecalculo === recalculoClienteId.current) {
                        setUltimasComprasClienteMap(result);
                    }
                } catch (e) {}
            })();
        }

        if (!mudouCliente || !codigoNovo || !itensPedido.length) {
            if (mudouCliente) setLoading(false);
            return;
        }

        setLoading(true);

        try {
            // Impostos dependem dos padrões comerciais do novo cliente. Sem esta
            // espera, a consulta pode usar operação e condição do cliente anterior.
            const dadosClienteNovo = await buscarDetalhesClientePedido(cli);
            if (idRecalculo !== recalculoClienteId.current) return;

            const operacaoNova = {
                cod_oper: dadosClienteNovo?.cod_oper || null,
                des_oper: dadosClienteNovo?.des_oper || null
            };
            const condPgtoNova = {
                cod_cond_pgto: dadosClienteNovo?.cod_cond_pgto || null,
                des_cond_pgto: dadosClienteNovo?.des_cond_pgto || null
            };

            if (!operacaoNova.cod_oper || !condPgtoNova.cod_cond_pgto) {
                throw new Error('O novo cliente não possui operação ou condição de pagamento padrão para recalcular os itens.');
            }

            const resultados = await mapComConcorrencia(itensPedido, 3, async item => ({
                    seq: item.seq,
                    dados: await buscarDadosItemComTentativas(item, {
                        clienteAtual: cli,
                        operacaoAtual: operacaoNova,
                        condPgtoAtual: condPgtoNova
                    })
                })
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
            }

            if (erros.length && idRecalculo === recalculoClienteId.current) {
                const itensComErro = resultados
                    .map((resultado, index) => resultado.status === 'rejected' ? itensPedido[index]?.cod_item : null)
                    .filter(Boolean);
                setModalErro({
                    aberto: true,
                    mensagem: `Não foi possível atualizar a tributação dos itens ${itensComErro.join(', ')}. Eles foram desmarcados para evitar o uso de valores do cliente anterior. Tente novamente.`,
                    seqItem: null,
                    focusSelector: null
                });
            }
        } catch (error) {
            if (idRecalculo !== recalculoClienteId.current) return;
            setItensPedido(prev => prev.map(item => ({
                ...item,
                valorLista: 0,
                impostos: null,
                baseST: null,
                semTributacao: true,
                selecionado: false,
                erroRecalculoCliente: true
            })));
            setModalErro({
                aberto: true,
                mensagem: error?.message || 'Não foi possível carregar os dados comerciais do novo cliente. Os itens foram desmarcados para evitar o uso de valores antigos.',
                seqItem: null,
                focusSelector: null
            });
        } finally {
            if (idRecalculo === recalculoClienteId.current) {
                setLoading(false);
            }
        }
    }

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
            .catch(() => null);

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
        const [respImp, acordosComerciais, ultimaCompraItem] = await Promise.all([
            getImpostosCached({
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

        const qtdMultiplo = detalheItem.qtd_multiplo ?? item.qtdMultiplo;
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
            ultimaCompraItem,
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

        if (['I', 'T'].includes(classificacao)) return '(MMT)';
        if (['A', 'B'].includes(classificacao)) return '(AC)';

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
        const numItem = nextNumItem.current;
        const itemBase = {
            grupoId,
            numItem,
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
            codListaPreco: null,
            infoListaPreco: null,
            precoListaPromocional: false,
            valorMinimoLista: null,
            precoListaBloqueado: false,
            semTributacao: false,
            sobraDesejada: null,
            impostos: null,
            baseST: null,
            acordosComerciais: [],
            ultimaCompraItem: null,
            selecionado: true,
            valorFrete: 0
        };
        // Cria os dois itens (201 e 203)
        const item201 = { ...itemBase, seq: nextId.current, unidade: 201, estoque: itemLov.estoque_matriz };
        const item203 = { ...itemBase, seq: nextId.current + 1, unidade: 203, estoque: itemLov.estoque_filial };
        nextId.current += 2; // avança o contador

        nextNumItem.current += 1;

        return [item201, item203];
    }

    async function adicionarItem(itemLov) {
        const itensLov = Array.isArray(itemLov) ? itemLov : [itemLov];
        const novosItens = itensLov.flatMap(criarItensPedido);

        setItensPedido(prev => [...prev, ...novosItens]);
        setOpenLovItens(false);
        setLoading(true);

        // Busca dados completos para cada item e atualiza
        try {
            const responseDetalhes = await getItensDetalhados({
                codItens: itensLov.map(item => item.cod_item)
            });
            const detalhesPorCodigo = new Map(
                (responseDetalhes.data?.items || []).map(item => [String(item.cod_item), item])
            );
            const resultados = await mapComConcorrencia(novosItens, 3, async item => ({
                    seq: item.seq,
                    dados: await buscarDadosItem(item, {
                        detalheItem: detalhesPorCodigo.get(String(item.cod_item))
                    })
                })
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
                        ? {
                            ...item,
                            ...dadosPorSeq.get(item.seq),
                            selecionado: dadosPorSeq.get(item.seq).semTributacao ? false : item.selecionado
                        }
                        : item
                )
            );

            if (erros.length) {
                alert('Erro ao carregar informaÃ§Ãµes de estoque ou impostos para alguns itens adicionados.');
            }
        } catch (error) {
            alert('Erro ao carregar informações de estoque ou impostos para o item adicionado.');
        } finally {
            setLoading(false);
        }
    }

    function removerItem(grupoId) {
        setItensPedido(prev => prev.filter(item => item.grupoId !== grupoId));
    }

    function handleQuantidadeChange(seq, valor) {
        setItensPedido(prev =>
            prev.map(item =>
                item.seq === seq ? { ...item, quantidade: valor } : item
            )
        );
    }

    function navegarCamposItens(event) {
        if (event.key !== 'Enter' && event.key !== 'Tab') return;

        const camposPorUnidade = [201, 203].flatMap(unidade =>
            ['quantidade-unidade', 'valor-lista', 'sobra-percentual'].flatMap(campo =>
                Array.from(document.querySelectorAll(
                    `input[data-field="${campo}"][data-unidade="${unidade}"]:not(:disabled)`
                ))
            )
        );
        const campos = camposPorUnidade.filter(campo => campo.offsetParent !== null);
        const indiceAtual = campos.indexOf(event.currentTarget);
        if (indiceAtual < 0 || !campos.length) return;

        const direcao = event.shiftKey ? -1 : 1;
        let proximoIndice = indiceAtual + direcao;

        if (proximoIndice < 0 || proximoIndice >= campos.length) {
            if (event.key === 'Tab') return;
            proximoIndice = proximoIndice < 0 ? campos.length - 1 : 0;
        }

        const proximoCampo = campos[proximoIndice];
        if (!proximoCampo) {
            return;
        }

        event.preventDefault();
        proximoCampo.focus();
        proximoCampo.select();
    }

    function handleValorListaChange(seq, valor) {
        setItensPedido(prev =>
            prev.map(item =>
                item.seq === seq && !item.precoListaBloqueado
                    ? { ...item, valorLista: valor, sobraDesejada: null }
                    : item
            )
        );
    }

    function validarValorListaPromocional(seq) {
        const item = itensPedido.find(itemAtual => itemAtual.seq === seq);
        if (!item?.precoListaPromocional) return;

        const valorInformado = numeroDecimalBR(item.valorLista);
        const valorMinimo = numeroDecimalBR(item.valorMinimoLista);
        if (Number.isFinite(valorInformado) && valorInformado >= valorMinimo) return;

        setItensPedido(prev => prev.map(itemAtual =>
            itemAtual.seq === seq
                ? { ...itemAtual, valorLista: valorMinimo.toFixed(4), sobraDesejada: null }
                : itemAtual
        ));
        setModalErro({
            aberto: true,
            mensagem: `O preço promocional não pode ser menor que ${format.moeda(valorMinimo)}.`,
            seqItem: null,
            focusSelector: `[data-field="valor-lista"][data-seq="${seq}"]`
        });
    }

    function resolverSistemaLinear(matriz, termos) {
        const sistema = matriz.map((linha, indice) => [...linha, termos[indice]]);
        const tamanho = sistema.length;

        for (let coluna = 0; coluna < tamanho; coluna += 1) {
            let pivo = coluna;
            for (let linha = coluna + 1; linha < tamanho; linha += 1) {
                if (Math.abs(sistema[linha][coluna]) > Math.abs(sistema[pivo][coluna])) pivo = linha;
            }
            if (Math.abs(sistema[pivo][coluna]) < 1e-12) return null;
            [sistema[coluna], sistema[pivo]] = [sistema[pivo], sistema[coluna]];

            const divisor = sistema[coluna][coluna];
            for (let j = coluna; j <= tamanho; j += 1) sistema[coluna][j] /= divisor;
            for (let linha = 0; linha < tamanho; linha += 1) {
                if (linha === coluna) continue;
                const fator = sistema[linha][coluna];
                for (let j = coluna; j <= tamanho; j += 1) sistema[linha][j] -= fator * sistema[coluna][j];
            }
        }
        return sistema.map(linha => linha[tamanho]);
    }

    function calcularTributosItem(item, valorVendaTotal) {
        const imp = item.impostos || {};
        const frete = Number(item.valorFrete || 0);
        const ativo = indicador => Number(indicador) === 1 ? 1 : 0;
        const rIpi = Number(imp.perIpi || 0) / 100;
        const rIcms = Number(imp.perIcms || 0) / 100;
        const rPis = Number(imp.perPis || 0) / 100;
        const rCofins = Number(imp.perCofins || 0) / 100;
        const baseIpiFixa = valorVendaTotal + ativo(imp.indIpiFreteSoma) * frete;
        const baseIcmsFixa = valorVendaTotal + ativo(imp.indIcmsFreteSoma) * frete;
        const basePiscofFixa = valorVendaTotal + ativo(imp.indPiscofFreteSoma) * frete;

        // Variáveis: IPI, ICMS, PIS e COFINS. A solução simultânea cobre
        // inclusive ICMS somando PIS/COFINS e PIS/COFINS abatendo ICMS.
        const matriz = [
            [1, 0, 0, 0],
            [-rIcms * ativo(imp.indIcmsIpiSoma), 1, -rIcms * ativo(imp.indIcmsPisSoma), -rIcms * ativo(imp.indIcmsCofinsSoma)],
            [-rPis * ativo(imp.indPiscofIpiSoma), rPis * ativo(imp.indPiscofIcmsAbate), 1, 0],
            [-rCofins * ativo(imp.indPiscofIpiSoma), rCofins * ativo(imp.indPiscofIcmsAbate), 0, 1]
        ];
        const termos = [rIpi * baseIpiFixa, rIcms * baseIcmsFixa, rPis * basePiscofFixa, rCofins * basePiscofFixa];
        const [ipi, icms, pis, cofins] = resolverSistemaLinear(matriz, termos) || [0, 0, 0, 0];
        const baseIpi = baseIpiFixa;
        const baseIcms = baseIcmsFixa
            + ativo(imp.indIcmsIpiSoma) * ipi
            + ativo(imp.indIcmsPisSoma) * pis
            + ativo(imp.indIcmsCofinsSoma) * cofins;
        const basePiscof = basePiscofFixa
            + ativo(imp.indPiscofIpiSoma) * ipi
            - ativo(imp.indPiscofIcmsAbate) * icms;

        return { ipi, icms, pis, cofins, baseIpi, baseIcms, basePiscof };
    }

    function calcularValorListaPorSobra(item, sobraPercentualDesejada) {
        const qtd = Number(item.quantidade || 0);
        const margem = Number(String(sobraPercentualDesejada).replace(',', '.')) / 100;

        if (!qtd || !Number.isFinite(margem)) return null;

        const itemSemPreco = { ...item, valorLista: 0 };
        const impostosFixos = calcularValoresItem(itemSemPreco, 0).totalImpostos;
        const impostosUmaUnidadeVenda = calcularValoresItem(itemSemPreco, 1).totalImpostos;
        const impostoVariavelPorReal = impostosUmaUnidadeVenda - impostosFixos;
        const divisor = 1 - impostoVariavelPorReal - margem;
        if (divisor <= 0) return null;

        const custoTotal = Number(item.vlrMedio || 0) * qtd;
        const frete = Number(item.valorFrete || 0);
        return (custoTotal + frete + impostosFixos) / divisor / qtd;
    }

    function handleSobraPercentualChange(seq, valor) {
        setItensPedido(prev => prev.map(item =>
            item.seq === seq && !item.precoListaBloqueado ? { ...item, sobraDesejada: valor } : item
        ));
    }

    function calcularPercentualMaximoSobra(item) {
        const itemSemPreco = { ...item, valorLista: 0 };
        const impostosFixos = calcularValoresItem(itemSemPreco, 0).totalImpostos;
        const impostosUmaUnidadeVenda = calcularValoresItem(itemSemPreco, 1).totalImpostos;
        return (1 - (impostosUmaUnidadeVenda - impostosFixos)) * 100;
    }

    function aplicarSobraPercentual(item, valor) {
        if (item?.precoListaBloqueado) return;
        // Apenas navegar pelo campo não deve recalcular o preço com a sobra
        // exibida em 2 casas, pois o preço de origem possui até 4 casas.
        if (item?.sobraDesejada === null || item?.sobraDesejada === undefined) return;

        const sobraInformada = Number(String(valor).replace(',', '.'));
        const percentualMaximo = calcularPercentualMaximoSobra(item);

        if (Number.isFinite(sobraInformada) && sobraInformada >= percentualMaximo) {
            setModalErro({
                aberto: true,
                mensagem: `A sobra informada excede o limite deste item. Informe um valor menor que ${percentualMaximo.toFixed(2).replace('.', ',')}%.`,
                seqItem: null,
                focusSelector: null
            });
            return;
        }

        const novoValorLista = calcularValorListaPorSobra(item, valor);
        if (novoValorLista === null || !Number.isFinite(novoValorLista)) return;
        const novoValorListaArredondado = Number(novoValorLista.toFixed(4));
        const valorMinimoLista = numeroDecimalBR(item.valorMinimoLista);

        if (item.precoListaPromocional && novoValorListaArredondado < valorMinimoLista) {
            setModalErro({
                aberto: true,
                mensagem: `O preço promocional não pode ser menor que ${format.moeda(valorMinimoLista)}.`,
                seqItem: null,
                focusSelector: `[data-field="valor-lista"][data-seq="${item.seq}"]`
            });
            return;
        }

        setItensPedido(prev => prev.map(itemAtual => {
            if (itemAtual.seq !== item.seq) return itemAtual;

            return {
                ...itemAtual,
                sobraDesejada: null,
                valorLista: novoValorListaArredondado.toFixed(4)
            };
        }));
    }

    useEffect(() => {
        carregarTiposLogradouro();
    }, []);

    function validarMultiplo(seq) {
        const item = itensPedido.find(i => i.seq === seq);
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
            handleQuantidadeChange(seq, '');
        }
    }

    function handleCheckboxChange(seq, checked) {
        setItensPedido(prev =>
            prev.map(item =>
                item.seq === seq && !itemSemTributacao(item) ? { ...item, selecionado: checked } : item
            )
        );
    }

    function selecionarItensPorUnidade(unidade, selecionado) {
        setItensPedido(prev =>
            prev.map(item =>
                Number(item.unidade) === Number(unidade)
                    ? { ...item, selecionado: itemSemTributacao(item) ? false : selecionado }
                    : item
            )
        );
        setMenuSelecaoItensOpen(null);
    }

    function calcularValoresItem(item, valorVendaTotalForcado = null) {
        const qtd = Number(item.quantidade || 0);
        const vlrLista = numeroDecimalBR(item.valorLista);
        const vlrMedio = Number(item.vlrMedio || 0);

        if (!qtd || (!vlrLista && valorVendaTotalForcado === null)) {
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

        const valorVendaTotal = valorVendaTotalForcado === null ? qtd * vlrLista : valorVendaTotalForcado;
        const valorCustoTotal = qtd * vlrMedio;

        const imp = item.impostos || {};
        const indSubsMercadoria = Number(imp.indSubsMercadoria || 0)
        const { icms, pis, cofins, ipi, baseIcms, basePiscof, baseIpi } = calcularTributosItem(item, valorVendaTotal);
        const fcp = valorVendaTotal * (Number(imp.perFcp || 0) / 100);

        let difal = 0;
        let st = 0;
        let baseSubs = 0;

        if (indSubsMercadoria === 1) {
            if (imp.difal && imp.difal.toUpperCase().includes('DIF')) {
                const perDifal = Number(imp.perDifal || 0);
                baseSubs = valorVendaTotal;
                baseSubs += Number(imp.indSubsFreteSoma) === 1 ? Number(item.valorFrete || 0) : 0;
                baseSubs += Number(imp.indSubsIpiSoma) === 1 ? ipi : 0;
                baseSubs += Number(imp.indSubsPisSoma) === 1 ? pis : 0;
                baseSubs += Number(imp.indSubsCofinsSoma) === 1 ? cofins : 0;
                difal = baseSubs * (perDifal / 100);
            } else {
                // 2.1 — ST por LISTA (prioridade maior que índice)
                if (item.baseST) {
                    baseSubs = item.baseST * qtd;
                }
                // 2.2 — ST por ÍNDICE
                else if (imp.idxSubsTrib) {
                    baseSubs = (valorVendaTotal * imp.idxSubsTrib);
                } else {
                    baseSubs = valorVendaTotal;
                }
                baseSubs += Number(imp.indSubsFreteSoma) === 1 ? Number(item.valorFrete || 0) : 0;
                baseSubs += Number(imp.indSubsIpiSoma) === 1 ? ipi : 0;
                baseSubs += Number(imp.indSubsPisSoma) === 1 ? pis : 0;
                baseSubs += Number(imp.indSubsCofinsSoma) === 1 ? cofins : 0;
                st = baseSubs * (Number(imp.perSubstTrib || 0) / 100);
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
            baseIcms,
            basePiscof,
            baseIpi,
            baseSubs,
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

    async function buscarDetalhesClientePedido(cli) {
        const codCliente = String(cli?.cod_pessoa ?? '').trim();

        if (dadosClienteCache.current.has(codCliente)) {
            return dadosClienteCache.current.get(codCliente);
        }

        const requisicao = getClienteDetalhado({ codPessoa: cli.cod_pessoa })
            .then(response => response.data.items?.[0] || cli)
            .then(dadosCliente => {
                dadosClienteCache.current.set(codCliente, dadosCliente);
                return dadosCliente;
            })
            .catch(error => {
                dadosClienteCache.current.delete(codCliente);
                throw error;
            });

        // O recálculo e o preenchimento dos campos compartilham a mesma chamada.
        dadosClienteCache.current.set(codCliente, requisicao);
        return requisicao;
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
            const response = await getClienteByFilter({ filtro: codigoCliente });
            const cli = response.data.items?.[0];

            if (!cli) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Cliente não encontrado com o código digitado!'
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
            const clientes = await getAllClientesCached();
            const cli = (clientes || []).find(c => String(c.cod_pessoa) === String(codClienteTriangulacaoDigitado));
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
                return;
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
            await atualizarOperacao(oper);
        } catch (error) {
            alert('Erro ao buscar operação');
        }
    }

    async function atualizarOperacao(novaOperacao) {
        const codigoAtual = String(operacao?.cod_oper ?? '').trim();
        const codigoNovo = String(novaOperacao?.cod_oper ?? '').trim();
        const mudouOperacao = codigoAtual !== codigoNovo;

        setOperacao(novaOperacao);

        if (!mudouOperacao || !codigoNovo || !cliente?.cod_pessoa || !itensPedido.length) {
            return;
        }

        const idRecalculo = ++recalculoClienteId.current;
        setFreteSelecionado({ 201: null, 203: null });
        setLoading(true);

        try {
            const resultados = await mapComConcorrencia(itensPedido, 3, async item => ({
                seq: item.seq,
                dados: await buscarDadosItem(item, { operacaoAtual: novaOperacao })
            }));
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
                        ? {
                            ...item,
                            ...dadosPorSeq.get(item.seq),
                            selecionado: dadosPorSeq.get(item.seq).semTributacao ? false : item.selecionado
                        }
                        : item
                ));
            }

            if (erros.length && idRecalculo === recalculoClienteId.current) {
                alert('Erro ao recalcular impostos para alguns itens na nova operação.');
            }
        } finally {
            if (idRecalculo === recalculoClienteId.current) {
                setLoading(false);
            }
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
        try {
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

            const retorno = await cotarSimFrete(itensSelecionados, {
                ...cliente,
                ...clienteDetalhado
            });

            const selecaoAuto = {};
            const unidadesSemCotacao = [];
            const cotacoesMap = {};

            retorno.forEach(r => {
                const lista = Array.isArray(r.transportadoras) ? r.transportadoras : [];
                cotacoesMap[r.unidade] = lista;

                const primeiraTransportadora = lista[0];

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

            setCotacoesFrete(cotacoesMap);
            setFreteSelecionado(selecaoAuto);
            aplicarRateioFrete(selecaoAuto);
        } catch (err) {
            alert(err.message || 'Erro ao cotar frete');
        } finally {
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

    function selecionarTransportadora(unidade, transporte) {
        if (!unidade) return;
        const novaSelecao = { ...freteSelecionado, [unidade]: transporte };
        setFreteSelecionado(novaSelecao);
        aplicarRateioFrete(novaSelecao);
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

    function numeroDecimalBR(valor) {
        const texto = String(valor ?? '').trim();
        const normalizado = texto.includes(',')
            ? texto.replace(/\./g, '').replace(',', '.')
            : texto;
        const numero = Number(normalizado);

        return Number.isFinite(numero) ? numero : 0;
    }

    function valorDecimalErp(valor) {
        return numeroDecimalBR(valor).toFixed(4).replace('.', ',');
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

        if (!ordemCompra.trim()) {
            return {
                mensagem: 'Informe a ordem de compra antes de enviar o pedido.',
                focusSelector: 'input[data-field="ordem-compra"]'
            };
        }

        return null;
    }

    function obterItensSelecionadosPorUnidades(unidadesSelecionadas = [201, 203]) {
        const unidades = unidadesSelecionadas.map(Number);

        return itensPedido.filter(item =>
            item.selecionado && unidades.includes(Number(item.unidade))
        );
    }

    function getPercentualMinimoSobraPorClassificacao(desGeral) {
        const classificacao = String(desGeral ?? '').trim().toUpperCase();

        if (['T', 'I'].includes(classificacao)) return 6;
        if (['A', 'B'].includes(classificacao)) return 4;

        return null;
    }

    function getNomeClassificacaoSobra(desGeral) {
        const classificacao = String(desGeral ?? '').trim().toUpperCase();

        if (['T', 'I'].includes(classificacao)) return 'MMT';
        if (['A', 'B'].includes(classificacao)) return 'AC';

        return classificacao;
    }

    async function avaliarSituacoesPedidoErp(unidadesSelecionadas = [201, 203]) {
        const itensSelecionados = obterItensSelecionadosPorUnidades(unidadesSelecionadas);
        const codItens = itensSelecionados.map(item => item.cod_item);

        if (!codItens.length) return { situacoesPorUnidade: {}, mensagens: [] };

        const response = await getItensClassificacao({ codItens });
        const classificacoesPorItem = (response.data.items || []).reduce((acc, item) => {
            acc[String(item.cod_item)] = item.des_geral;
            return acc;
        }, {});
        const situacoesPorUnidade = {};
        const mensagens = [];

        unidadesSelecionadas.map(Number).forEach(unidade => {
            const itensUnidade = itensSelecionados.filter(item => Number(item.unidade) === unidade);
            if (!itensUnidade.length) return;

            const totais = itensUnidade.reduce((acc, item) => {
                const valores = calcularValoresItem(item);
                acc.valorVenda += Number(valores.valorVendaTotal || 0);
                acc.sobra += Number(valores.sobraReal || 0);
                return acc;
            }, { valorVenda: 0, sobra: 0 });
            const sobraTotal = Number((totais.valorVenda > 0
                ? (totais.sobra / totais.valorVenda) * 100
                : 0).toFixed(2));
            const minimosSobraItens = itensUnidade.map(item =>
                getPercentualMinimoSobraPorClassificacao(
                    classificacoesPorItem[String(item.cod_item)]
                )
            );
            // Somente itens AC: 4%. Se houver MMT ou item sem classificação: 6%.
            const minimoSobraTotal = minimosSobraItens.every(minimo => minimo === 4)
                ? 4
                : 6;
            const itensForaRegra = itensUnidade.reduce((erros, item) => {
                if (item.precoListaBloqueado) return erros;

                const classificacao = classificacoesPorItem[String(item.cod_item)];
                const minimoSobra = getPercentualMinimoSobraPorClassificacao(classificacao);
                if (minimoSobra === null) return erros;

                const sobraPercentual = Number(Number(
                    calcularValoresItem(item).sobraPercentual || 0
                ).toFixed(2));
                if (sobraPercentual < minimoSobra) {
                    erros.push({ item, classificacao, minimoSobra, sobraPercentual });
                }
                return erros;
            }, []);

            const requerAprovacao = sobraTotal < minimoSobraTotal || itensForaRegra.length > 0;
            situacoesPorUnidade[unidade] = requerAprovacao
                ? 70
                : modalidadeIntegracao === 7 ? 32 : 6;

            if (sobraTotal < minimoSobraTotal) {
                mensagens.push(
                    `UNIDADE ${unidade}\n` +
                    `Sobra total: ${sobraTotal.toFixed(2).replace('.', ',')}% (mínima: ${minimoSobraTotal}%)\n` +
                    'A sobra total está abaixo da mínima. O pedido irá para aprovação no NL em situação 70.'
                );
            } else if (itensForaRegra.length) {
                const detalhes = itensForaRegra.map(({ item, classificacao, minimoSobra, sobraPercentual }) =>
                    `• Item seq. ${item.seq} - ${item.cod_item} (${getNomeClassificacaoSobra(classificacao)}) — ` +
                    `sobra ${sobraPercentual.toFixed(2).replace('.', ',')}% < mínima ${minimoSobra}%`
                ).join('\n');
                mensagens.push(
                    `UNIDADE ${unidade}\n` +
                    `Sobra total: ${sobraTotal.toFixed(2).replace('.', ',')}% (mínima atingida)\n\n` +
                    `Itens abaixo da sobra exigida:\n${detalhes}\n\n` +
                    'O pedido irá para aprovação no NL em situação 70.'
                );
            }
        });

        return { situacoesPorUnidade, mensagens };
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
            desLogradouro: logradouroDigitado,
            codLogradouro: getCodigoTipoLogradouro(tipoLogradouroSelecionado),
            desBairro: bairroDigitado,
            codCidade: apenasNumeros(codCidadeDigitado)
                ? Number(apenasNumeros(codCidadeDigitado))
                : null,
            numCep: Number(apenasNumeros(codCepDigitado)),
            numLogradouro: Number(apenasNumeros(numeroEnderecoDigitado) || 0),
            dtaTransacao: dataTransacao,
            tipTransacao: 1
        });
    }

    function montarPayloadPedidoErpPorUnidade(unidadePedido, itensUnidade, codSituacao = 6) {
        const dataErp = dataAtualErp();
        const dataTransacao = dataCargaDigitada || dataErp;
        const peObservacoes = montarPeObservacoes();
        const peEndEntrega = montarPeEndEntrega(unidadePedido, dataTransacao);

        const pePedidos = {
            codEmp: '01',
            codUnidade: unidadePedido,
            numPedido: '0',
            numSeqConf: modalidadeIntegracao,
            codCompl: 99,
            desNumOcCliente: ordemCompra || null,
            codSituacao,
            dtaEmissao: dataErp,
            dtaDigitacao: dataErp,
            tipFrete: 1,
            codCondPgto: String(CondPgto.cod_cond_pgto),
            codOper: String(operacao.cod_oper),
            codOperRemessa: operacaoTriangulacao.cod_oper ? String(operacaoTriangulacao.cod_oper) : null,
            indConsumidor: Number(clienteDetalhado?.ind_consumidor) === 1 ? 1 : 0,
            codCliente: String(cliente.cod_pessoa),
            codClienteRemessa: clienteTriangulacao?.cod_pessoa ? String(clienteTriangulacao.cod_pessoa) : null,
            codRepresentante: representante?.cod_pessoa_rep ? String(representante.cod_pessoa_rep) : null,
            tipTransacao: 1,
            peItens: itensUnidade.map(item => ({
                codItem: String(item.cod_item),
                codLista: item.codListaPreco != null ? String(item.codListaPreco) : null,
                codReserva: 7,
                qtdNegociada: Number(item.quantidade),
                vlrUniBruto: valorDecimalErp(item.valorLista),
                codUnidadeRetira: unidadePedido,
                tipTransacao: 1,
                qtdReservada: Number(item.quantidade),
                indVlrAlterado: 0,
                numItem: item.numItem
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

    function montarPayloadsPedidoErp(unidadesSelecionadas = [201, 203], situacoesPorUnidade = {}) {
        const erroValidacao = validarPedidoErp();

        if (erroValidacao) {
            throw erroValidacao;
        }

        const unidades = unidadesSelecionadas.map(Number);

        if (!unidades.length) {
            throw { mensagem: 'Selecione ao menos uma unidade para gerar o pedido.' };
        }

        const gruposSelecionados = unidades
            .map(unidade => ({
                unidade,
                itens: obterItensSelecionadosPorUnidades([unidade])
            }))
            .filter(grupo => grupo.itens.length);

        if (!gruposSelecionados.length) {
            throw { mensagem: 'As unidades escolhidas não possuem itens marcados para integração.' };
        }

        return gruposSelecionados.map(grupo =>
            montarPayloadPedidoErpPorUnidade(
                grupo.unidade,
                grupo.itens,
                situacoesPorUnidade[grupo.unidade] ?? 6
            )
        );
    }

    function abrirSelecaoUnidadesPedido() {
        const erroValidacao = validarPedidoErp();

        if (erroValidacao) {
            setModalErro({ aberto: true, ...erroValidacao });
            return;
        }

        setOpenLovUnidadesPedido(true);
    }

    function exibirErroEnvioPedidoErp(error) {
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
    }

    async function enviarPedidosAoErp(unidadesSelecionadas, situacoesPorUnidade) {
        try {
            setLoading(true);
            const payloads = montarPayloadsPedidoErp(unidadesSelecionadas, situacoesPorUnidade);

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
                mensagem: pedidos,
                limparAoFechar: true
            });
        } catch (error) {
            exibirErroEnvioPedidoErp(error);
        } finally {
            setLoading(false);
        }
    }

    async function finalizarPedidoErp(unidadesSelecionadas) {
        try {
            setOpenLovUnidadesPedido(false);
            setLoading(true);

            const avaliacao = await avaliarSituacoesPedidoErp(unidadesSelecionadas);

            if (avaliacao.mensagens.length) {
                setModalConfirmacaoErp({
                    aberto: true,
                    mensagem: `${avaliacao.mensagens.join('\n\n')}\n\nDeseja prosseguir?`,
                    unidadesSelecionadas,
                    situacoesPorUnidade: avaliacao.situacoesPorUnidade
                });
                return;
            }

            await enviarPedidosAoErp(unidadesSelecionadas, avaliacao.situacoesPorUnidade);
        } catch (error) {
            exibirErroEnvioPedidoErp(error);
        } finally {
            setLoading(false);
        }
    }

    function cancelarEnvioPedidoErp() {
        setModalConfirmacaoErp({
            aberto: false,
            mensagem: '',
            unidadesSelecionadas: [],
            situacoesPorUnidade: {}
        });
    }

    function confirmarEnvioPedidoErp() {
        const { unidadesSelecionadas, situacoesPorUnidade } = modalConfirmacaoErp;
        cancelarEnvioPedidoErp();
        enviarPedidosAoErp(unidadesSelecionadas, situacoesPorUnidade);
    }

    function obterDadosPropostaTela() {
        return {
            cliente,
            clienteDetalhado,
            representante,
            condicaoPagamento: CondPgto,
            ordemCompra,
            dataCarga: dataCargaDigitada,
            observacoes,
            itensPedido,
            freteSelecionado,
            opcaoFrete,
            endereco: {
                cep: codCepDigitado,
                uf: codUfDigitado,
                cidade: cidade?.des_cidade || '',
                tipoLogradouro: tipoLogradouroSelecionado,
                logradouro: logradouroDigitado,
                numero: numeroEnderecoDigitado,
                complemento: complementoEnderecoDigitado,
                bairro: bairroDigitado,
                referencia: referenciaEnderecoDigitado
            }
        };
    }

    function abrirEmissaoProposta() {
        const erro = validarDadosProposta(obterDadosPropostaTela());
        if (erro) {
            setModalErro({ aberto: true, mensagem: erro, seqItem: null, focusSelector: null });
            return;
        }
        setModalEmitirProposta(true);
    }

    async function emitirProposta(formato) {
        try {
            setGerandoProposta(true);
            const responseCliente = await getClienteByFilter({ filtro: cliente.cod_pessoa }).catch(() => null);
            const clienteContato = responseCliente?.data?.items?.[0] || {};
            const dadosProposta = obterDadosPropostaTela();
            dadosProposta.cliente = { ...dadosProposta.cliente, ...clienteContato };
            const propostas = criarPropostasPorUnidade(dadosProposta);
            await exportarPropostas(propostas, formato);
            setModalEmitirProposta(false);
        } catch (error) {
            setModalEmitirProposta(false);
            setModalErro({
                aberto: true,
                mensagem: error?.message || 'Não foi possível gerar a proposta.',
                seqItem: null,
                focusSelector: null
            });
        } finally {
            setGerandoProposta(false);
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
            setClienteDetalhado(null);
            setRepresentante(null);
            setOperacao({ cod_oper: null, des_oper: null });
            setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
            setPrazoMedioVenda(null);
            setClienteConsumidor(false);
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

            setClienteDetalhado(dadosClientePedido || null);
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
            setClienteConsumidor(Number(dadosClientePedido?.ind_consumidor) === 1);
            setCreditoCliente({
                atingido,
                limiteMensal,
                titulosVencidos
            });
            setCodCondPgtoDigitado(dadosClientePedido?.cod_cond_pgto || '');
        }).catch(() => {
            if (carregamentoCancelado) return;

            setClienteDetalhado(null);
            setOperacao({ cod_oper: null, des_oper: null });
            setCodOperacaoDigitado('');
            setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
            setPrazoMedioVenda(null);
            setClienteConsumidor(false);
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

    const itensAgrupadosOrdenados = !ordenacaoItens.coluna || !ordenacaoItens.direcao
        ? itensAgrupados
        : [...itensAgrupados].sort((grupoA, grupoB) => {
            const itemA = grupoA[201] || grupoA[203];
            const itemB = grupoB[201] || grupoB[203];
            const resultado = String(itemA?.[ordenacaoItens.coluna] ?? '').localeCompare(
                String(itemB?.[ordenacaoItens.coluna] ?? ''),
                'pt-BR',
                { numeric: true, sensitivity: 'base' }
            );

            return ordenacaoItens.direcao === 'asc' ? resultado : -resultado;
        });

    function alternarOrdenacaoItens(coluna) {
        setOrdenacaoItens(prev => {
            if (prev.coluna !== coluna) {
                return { coluna, direcao: 'asc' };
            }

            if (prev.direcao === 'asc') {
                return { coluna, direcao: 'desc' };
            }

            return { coluna: null, direcao: null };
        });
    }

    function cabecalhoOrdenavelItens(coluna, texto) {
        const indicador = ordenacaoItens.coluna === coluna
            ? ordenacaoItens.direcao === 'asc' ? '↑' : '↓'
            : '';

        return (
            <button
                type="button"
                className="itens-sort-button"
                onClick={() => alternarOrdenacaoItens(coluna)}
            >
                <span>{texto}</span>
                <span className="itens-sort-indicator">{indicador}</span>
            </button>
        );
    }

    const unidadesComItensSelecionados = [...new Set(
        itensPedido.filter(item => item.selecionado).map(item => Number(item.unidade))
    )].sort((a, b) => a - b);
    const totaisPorUnidade = itensPedido
        .filter(item => item.selecionado)
        .reduce((totais, item) => {
            const valores = calcularValoresItem(item);
            const totaisUnidade = totais[item.unidade];
            totaisUnidade.valorVenda += Number(valores.valorVendaTotal || 0);
            totaisUnidade.frete += Number(item.valorFrete || 0);
            totaisUnidade.sobra += Number(valores.sobraReal || 0);
            return totais;
        }, {
            201: { valorVenda: 0, frete: 0, sobra: 0 },
            203: { valorVenda: 0, frete: 0, sobra: 0 }
        });
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

    function renderTotaisUnidade(unidade) {
        const totais = totaisPorUnidade[unidade];
        const percentualFrete = totais.valorVenda > 0
            ? (totais.frete / totais.valorVenda) * 100
            : 0;
        const percentualSobra = totais.valorVenda > 0
            ? (totais.sobra / totais.valorVenda) * 100
            : 0;
        const freteFoiCotado = Boolean(freteSelecionado[unidade]);

        return (
            <div className="unidade-totais" aria-label={`Totais da unidade ${unidade}`}>
                <div className="pedido-total-card pedido-total-venda">
                    <span className="pedido-total-label">Valor total</span>
                    <strong>{format.moeda(totais.valorVenda)}</strong>
                </div>
                <div className="pedido-total-card pedido-total-frete">
                    <span className="pedido-total-label">Frete</span>
                    {freteFoiCotado ? (
                        <>
                            <div className="frete-valor-row">
                                <div className="frete-valor">
                                    <strong>{format.percentual(percentualFrete)}</strong>
                                    <small>{format.moeda(totais.frete)}</small>
                                </div>
                                <div className="lov-info-wrap frete-info-inline">
                                    <span className="lov-info-icon">i</span>
                                    <div className="lov-tooltip-info frete-tooltip">
                                        <strong style={{display: 'block', marginBottom: 8}}>Cotações de frete</strong>
                                        { (cotacoesFrete[unidade] || []).length === 0 ? (
                                            <div className="lov-tooltip-acordo">Nenhuma cotação disponível</div>
                                        ) : (
                                            (cotacoesFrete[unidade] || []).map((t, idx) => {
                                                const isSel = freteSelecionado[unidade] && String(freteSelecionado[unidade].cnpj) === String(t.cnpj) && Number(freteSelecionado[unidade].valor) === Number(t.valor);
                                                return (
                                                    <div key={idx} className={['frete-tooltip-item', isSel ? 'frete-tooltip-item-selected' : ''].filter(Boolean).join(' ')} onClick={(e) => { e.stopPropagation(); selecionarTransportadora(unidade, t); }}>
                                                        <label className="frete-tooltip-row">
                                                            <input type="checkbox" className="frete-checkbox" checked={isSel} readOnly />
                                                            <div className="frete-tooltip-main">
                                                                <div className="tip-linha">
                                                                    <span className="tip-nome" style={{flex: '1 1 auto'}}>{t.nome}</span>
                                                                    <span className="tip-valor">{t.prazo ? `${t.prazo} dias` : '-'}</span>
                                                                    <span className="tip-valor" style={{marginLeft: 12}}>{format.moeda(t.valor)}</span>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <strong className="pedido-total-pendente">Não cotado</strong>
                    )}
                </div>
                <div className={`pedido-total-card ${totais.sobra >= 0 ? 'pedido-total-sobra-positiva' : 'pedido-total-sobra-negativa'}`}>
                    <span className="pedido-total-label">Sobra</span>
                    <strong>{format.percentual(percentualSobra)}</strong>
                    <small>{format.moeda(totais.sobra)}</small>
                </div>
            </div>
        );
    }

    function renderInfoItem(item, valores) {
        if (!item) return '-';

        const freteItem = freteSelecionado[item.unidade];
        const possuiAcordo = itemPossuiAcordo(item);
        const possuiUltimaCompra = itemPossuiUltimaCompra(item);
        const imp = item.impostos || {};
        const componente = (nome, tipo = 'soma') => ({ nome, tipo });
        const componentesAtivos = (...entradas) => entradas.filter(Boolean);
        const composicoesBases = [
            { nome: 'ICMS', componentes: componentesAtivos(
                componente('Venda', 'base'),
                Number(imp.indIcmsFreteSoma) === 1 && componente('Frete'),
                Number(imp.indIcmsIpiSoma) === 1 && componente('IPI'),
                Number(imp.indIcmsPisSoma) === 1 && componente('PIS'),
                Number(imp.indIcmsCofinsSoma) === 1 && componente('COFINS')
            )},
            { nome: 'PIS/COFINS', componentes: componentesAtivos(
                componente('Venda', 'base'),
                Number(imp.indPiscofFreteSoma) === 1 && componente('Frete'),
                Number(imp.indPiscofIpiSoma) === 1 && componente('IPI'),
                Number(imp.indPiscofIcmsAbate) === 1 && componente('ICMS', 'abate')
            )},
            { nome: 'IPI', componentes: componentesAtivos(
                componente('Venda', 'base'),
                Number(imp.indIpiFreteSoma) === 1 && componente('Frete')
            )},
            Number(imp.indSubsMercadoria) === 1 && {
                nome: imp.difal?.toUpperCase().includes('DIF') ? 'DIFAL' : 'ICMS ST',
                componentes: componentesAtivos(
                    componente(item.baseST ? 'Lista ST' : imp.idxSubsTrib ? 'Venda × índice' : 'Venda', 'base'),
                    Number(imp.indSubsFreteSoma) === 1 && componente('Frete'),
                    Number(imp.indSubsIpiSoma) === 1 && componente('IPI'),
                    Number(imp.indSubsPisSoma) === 1 && componente('PIS'),
                    Number(imp.indSubsCofinsSoma) === 1 && componente('COFINS')
                )
            }
        ].filter(Boolean);

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
                    <details className="tip-bases">
                        <summary className="tip-bases-titulo">Composição das bases</summary>
                        <div className="tip-bases-conteudo">
                            {composicoesBases.map(base => (
                                <div className="tip-base-linha" key={base.nome}>
                                    <span className="tip-base-nome">{base.nome}</span>
                                    <div className="tip-base-componentes">
                                        {base.componentes.map((itemBase, index) => (
                                            <span className={`tip-base-chip tip-base-chip-${itemBase.tipo}`} key={`${itemBase.nome}-${index}`}>
                                                {itemBase.tipo === 'soma' ? '+ ' : itemBase.tipo === 'abate' ? '− ' : ''}{itemBase.nome}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
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
                    {possuiUltimaCompra && (
                        <div className="tooltip-ultima-compra">
                            <strong>Últimas compras</strong>
                            {item.ultimaCompraItemDasUltimasCompras.slice(0, 5).map((compra, index) => (
                                <div className="historico-compra-linha" key={`${compra.dta_emissao}-${compra.vlr_unitario}-${index}`}>
                                    {getCodigoUnidadeCompra(compra)} - {formatarDataHistoricoCliente(compra.dta_emissao)} - {format.moeda(compra.vlr_unitario)}
                                </div>
                            ))}
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
                            onSelect={(op) => { atualizarOperacao({ cod_oper: op.cod_oper, des_oper: op.des_oper }); setCodOperacaoDigitado(op.cod_oper); }}
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
                    <label>Consumidor Final:</label>
                    <div className="field-group consumidor-field">
                        <input type="checkbox" checked={clienteConsumidor} readOnly aria-label="Cliente consumidor" />
                    </div>
                    <label>Modalidade de Integração:</label>
                    <div className="field-group modalidade-integracao-field">
                        <div className="seletor-verde-wrap">
                            <button
                                type="button"
                                className="btn-modalidade-integracao"
                                aria-haspopup="listbox"
                                aria-expanded={menuModalidadeIntegracaoOpen}
                                onClick={() => {
                                    setMenuModalidadeIntegracaoOpen(aberto => !aberto);
                                    setMenuOpcaoFreteOpen(false);
                                }}
                            >
                                {modalidadeIntegracao === 7 ? '7 - Orçamento/Contrato' : '2 - Orçamento'}
                            </button>
                            {menuModalidadeIntegracaoOpen && (
                                <div className="modalidade-integracao-menu" role="listbox" aria-label="Modalidade de Integração">
                                    <button type="button" role="option" aria-selected={modalidadeIntegracao === 2} onClick={() => { setModalidadeIntegracao(2); setMenuModalidadeIntegracaoOpen(false); }}>
                                        2 - Orçamento
                                    </button>
                                    <button type="button" role="option" aria-selected={modalidadeIntegracao === 7} onClick={() => { setModalidadeIntegracao(7); setMenuModalidadeIntegracaoOpen(false); }}>
                                        7 - Orçamento/Contrato
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="opcao-frete-inline">
                            <span>Opções de frete:</span>
                            <div className="seletor-verde-wrap">
                                <button
                                    type="button"
                                    className="btn-modalidade-integracao btn-opcao-frete"
                                    aria-haspopup="listbox"
                                    aria-expanded={menuOpcaoFreteOpen}
                                    onClick={() => {
                                        setMenuOpcaoFreteOpen(aberto => !aberto);
                                        setMenuModalidadeIntegracaoOpen(false);
                                    }}
                                >
                                    {opcaoFrete === 'COBRAR_NF' ? 'Cobrar na NF' : 'CIF'}
                                </button>
                                {menuOpcaoFreteOpen && (
                                    <div className="modalidade-integracao-menu opcao-frete-menu" role="listbox" aria-label="Opções de frete">
                                        <button type="button" role="option" aria-selected={opcaoFrete === 'CIF'} onClick={() => { setOpcaoFrete('CIF'); setMenuOpcaoFreteOpen(false); }}>
                                            CIF
                                        </button>
                                        <button type="button" role="option" aria-selected={opcaoFrete === 'COBRAR_NF'} onClick={() => { setOpcaoFrete('COBRAR_NF'); setMenuOpcaoFreteOpen(false); }}>
                                            Cobrar na NF
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="item-card">
                <div className="pedido-title item-card-title-actions">
                    <h2>Itens do Pedido</h2>
                    <button
                        type="button"
                        className="btn-recalcular-itens"
                        onClick={recalcularItensManualmente}
                        disabled={loading || loadingDadosCliente || !itensPedido.length}
                    >
                        Recalcular itens
                    </button>
                </div>
                <div className="itens-table-wrapper">
                    <div className="tabelas-itens-layout">
                        <section className="tabela-itens-bloco tabela-itens-principal">
                            <div className="tabela-bloco-cabecalho">
                                <div className="itens-legenda-titulo">
                                    <h3>Itens</h3>
                                    <div className="itens-legenda-info">
                                        <button type="button" className="itens-legenda-trigger" aria-label="Ver legenda dos itens">
                                            <IoInformationOutline />
                                        </button>
                                        <div className="itens-legenda-tooltip" role="tooltip">
                                            <strong>Legenda dos itens</strong>

                                            <div className="itens-legenda-secao">
                                                <span className="itens-legenda-subtitulo">Cores e símbolos</span>
                                                <div className="itens-legenda-linha"><span className="itens-legenda-cor legenda-cor-acordo" /><b>©</b><span>Acordo comercial</span></div>
                                                <div className="itens-legenda-linha"><span className="itens-legenda-cor legenda-cor-ultima-compra" /><b>✓</b><span>Item da última compra</span></div>
                                                <div className="itens-legenda-linha"><span className="itens-legenda-cor legenda-cor-preco-bloqueado" /><b>$</b><span>Preço promocional ou contrato</span></div>
                                                <div className="itens-legenda-linha"><span className="itens-legenda-cor legenda-cor-sem-tributacao" /><b>!</b><span>Item sem tributação</span></div>
                                                <div className="itens-legenda-linha"><span className="itens-legenda-cor legenda-cor-lote-proximo" /><FaHourglassHalf /><span>Lote com validade próxima</span></div>
                                            </div>

                                            <div className="itens-legenda-secao itens-legenda-margens">
                                                <span className="itens-legenda-subtitulo">Margens mínimas</span>
                                                <div><span className="itens-legenda-segmento">AC</span><strong>4%</strong></div>
                                                <div><span className="itens-legenda-segmento">MMT</span><strong>6%</strong></div>
                                                <div><span className="itens-legenda-segmento">Total da unidade</span><strong>6%</strong></div>
                                            </div>

                                            <small>Valores abaixo da margem seguem para aprovação em situação 70.</small>
                                        </div>
                                    </div>
                                </div>
                                <span>Dados do item</span>
                            </div>
                            <table className="itens-grid itens-grid-selecao">
                                <thead><tr><th>Seq.</th><th>Cód.</th><th>{cabecalhoOrdenavelItens('descricao', 'Item')}</th><th>{cabecalhoOrdenavelItens('principiosAtivos', 'Princ. ativo')}</th><th>{cabecalhoOrdenavelItens('marca', 'Marca')}</th><th></th></tr></thead>
                                <tbody>
                                    {itensAgrupadosOrdenados.map(grupo => {
                                        let itemBase = grupo[201] || grupo[203];
                                        const possuiAcordo = [grupo[201], grupo[203]].some(item => item && itemPossuiAcordo(item));
                                        const possuiPrecoBloqueado = [grupo[201], grupo[203]].some(item => item && itemPossuiPrecoListaBloqueado(item));
                                        const possuiUltimaCompra = [grupo[201], grupo[203]].some(item => item && itemPossuiUltimaCompra(item)) && !possuiAcordo && !possuiPrecoBloqueado;
                                        const semTributacao = [grupo[201], grupo[203]].some(item => item && itemSemTributacao(item));
                                        const loteProximo = lotesProximosMap[String(itemBase.cod_item)];
                                        const destaqueClassificacao = getDestaqueClassificacao(itemBase);
                                        if (destaqueClassificacao) {
                                            itemBase = {
                                                ...itemBase,
                                                descricao: `${itemBase.descricao}\n${destaqueClassificacao}`
                                            };
                                        }
                                        const classeLinha = getClasseLinhaItem({ loteProximo, semTributacao, possuiPrecoBloqueado, possuiAcordo, possuiUltimaCompra });
                                        return (
                                            <tr key={grupo.grupoId} className={classeLinha}>
                                                <td>{itemBase.numItem}</td>
                                                <td>{itemBase.cod_item}{loteProximo && <FaHourglassHalf className="item-lote-proximo-marca" title="Lote com validade próxima" aria-label="Lote com validade próxima" />}{possuiPrecoBloqueado && <span className="item-preco-bloqueado-marca" title="Preço de lista promocional ou contrato">$</span>}{possuiAcordo && <span className="item-acordo-marca">©</span>}{[grupo[201], grupo[203]].some(item => item && itemPossuiUltimaCompra(item)) && <span className="item-ultima-compra-marca">✓</span>}</td>
                                                <td><span className="item-cell-text">{itemBase.descricao}</span>{semTributacao && <span className="item-sem-tributacao-marca">Item sem tributação</span>}</td>
                                                <td><span className="item-cell-text">{itemBase.principiosAtivos || '-'}</span></td>
                                                <td>{itemBase.marca || '-'}</td>
                                                <td><button type="button" className="btn-remover-item" onClick={() => removerItem(grupo.grupoId)} title="Remover item"><FaTrash /></button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </section>

                        {[{ unidade: 201, titulo: 'Unidade 201 (Matriz)' }, { unidade: 203, titulo: 'Unidade 203 (Filial)' }].map(config => (
                            <section className="tabela-itens-bloco tabela-unidade-resumo" key={config.unidade}>
                                <div className="tabela-bloco-cabecalho">
                                    <h3>{config.titulo}</h3>
                                    <div className="item-selection-menu">
                                        <button type="button" className="item-selection-trigger" onClick={() => setMenuSelecaoItensOpen(prev => prev === config.unidade ? null : config.unidade)}>Selecionar</button>
                                        {menuSelecaoItensOpen === config.unidade && (
                                            <div className="item-selection-dropdown">
                                                <button type="button" onClick={() => selecionarItensPorUnidade(config.unidade, true)}>Marcar todos</button>
                                                <button type="button" onClick={() => selecionarItensPorUnidade(config.unidade, false)}>Desmarcar todos</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <table className="itens-grid itens-grid-unidade">
                                    <thead><tr><th>Enviar</th><th>Qtd.</th><th>Estoque</th><th>Vlr Lista</th><th>Vlr Total</th><th>Sobra %</th><th>Info</th></tr></thead>
                                    <tbody>
                                        {itensAgrupadosOrdenados.map(grupo => {
                                            const item = grupo[config.unidade];
                                            const possuiAcordo = item && itemPossuiAcordo(item);
                                            const possuiPrecoBloqueado = item && itemPossuiPrecoListaBloqueado(item);
                                            const possuiUltimaCompra = item && itemPossuiUltimaCompra(item) && !possuiAcordo && !possuiPrecoBloqueado;
                                            if (!item) return <tr key={grupo.grupoId}><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>;
                                            const valores = calcularValoresItem(item);
                                            const semTributacao = itemSemTributacao(item);
                                            const loteProximo = lotesProximosMap[String(item.cod_item)];
                                            const classeLinha = getClasseLinhaItem({ loteProximo, semTributacao, possuiPrecoBloqueado, possuiAcordo, possuiUltimaCompra });
                                            return (
                                                <tr key={grupo.grupoId} className={classeLinha}>
                                                    <td><input type="checkbox" checked={Boolean(item.selecionado)} disabled={semTributacao} title={semTributacao ? 'Item sem tributação: envio ao ERP bloqueado' : undefined} onChange={(e) => handleCheckboxChange(item.seq, e.target.checked)} aria-label={`Enviar item ${item.cod_item} pela unidade ${item.unidade}`} /></td>
                                                    <td><input className="item-table-input" data-field="quantidade-unidade" data-unidade={item.unidade} data-seq={item.seq} value={item.quantidade} disabled={!item.selecionado || semTributacao} onChange={(e) => handleQuantidadeChange(item.seq, e.target.value)} onBlur={() => validarMultiplo(item.seq)} onKeyDown={navegarCamposItens} /></td>
                                                    <td>{item.estoque}</td>
                                                    <td><input className="item-table-input item-table-money" data-field="valor-lista" data-unidade={item.unidade} data-seq={item.seq} value={item.valorLista} disabled={item.precoListaBloqueado} title={item.precoListaBloqueado ? 'Preço bloqueado por contrato' : item.precoListaPromocional ? 'Preço promocional: permitido somente aumentar' : undefined} onFocus={e => e.target.select()} onChange={(e) => handleValorListaChange(item.seq, maskMoneyBR(e.target.value, 4))} onBlur={() => validarValorListaPromocional(item.seq)} onKeyDown={navegarCamposItens} /></td>
                                                    <td>{format.moeda(valores.valorVendaTotal ?? 0)}</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            className="item-table-input item-table-percent"
                                                            data-field="sobra-percentual"
                                                            data-unidade={item.unidade}
                                                            data-seq={item.seq}
                                                            value={item.sobraDesejada ?? Number(valores.sobraPercentual ?? 0).toFixed(2)}
                                                            disabled={item.precoListaBloqueado}
                                                            title={item.precoListaBloqueado ? 'Sobra bloqueada por contrato' : item.precoListaPromocional ? 'O preço resultante não pode ser menor que o promocional' : undefined}
                                                            onFocus={e => e.target.select()}
                                                            onChange={e => handleSobraPercentualChange(item.seq, e.target.value)}
                                                            onBlur={e => aplicarSobraPercentual(item, e.target.value)}
                                                            onKeyDown={navegarCamposItens}
                                                            style={{ color: valores.sobraReal >= 0 ? 'green' : 'red', fontWeight: 'bold' }}
                                                            aria-label={`Sobra percentual do item ${item.cod_item} na unidade ${item.unidade}`}
                                                        />
                                                    </td>
                                                    <td className="info-cell">{renderInfoItem(item, valores)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {renderTotaisUnidade(config.unidade)}
                            </section>
                        ))}
                    </div>
                </div>
                <div className="item-card-container">
                    <button className="btn-adicionar-item" onClick={() => {
                        if (!cliente) {
                            setModalErro({
                                aberto: true,
                                mensagem: `Selecione um cliente antes de adicionar item!`
                            });
                            return;
                        }
                        if (!operacao.cod_oper) {
                            setModalErro({
                                aberto: true,
                                mensagem: `Selecione uma operação antes de adicionar item!`
                            });
                            return;
                        }
                        if (!CondPgto.cod_cond_pgto) {
                            setModalErro({
                                aberto: true,
                                mensagem: `Selecione uma condição de pagamento antes de adicionar item!`
                            });
                            return;
                        }
                        setOpenLovItens(true)
                    }
                    }>+ Item</button>
                    <button className="btn-cotar-simfrete" onClick={cotar}>Cotar SimFrete</button>
                </div>

                <LovItens
                    isOpen={openLovItens}
                    setLovOpen={() => setOpenLovItens(!openLovItens)}
                    itensExistentes={itensPedido}
                    codCliente={cliente?.cod_pessoa}
                    codOper={operacao.cod_oper}
                    codCondPgto={CondPgto.cod_cond_pgto}
                    ultimasComprasMap={ultimasComprasClienteMap}
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
                    const deveLimparTela = modalSucesso.limparAoFechar;
                    setModalSucesso({ aberto: false, mensagem: '', limparAoFechar: false });
                    if (deveLimparTela) limparTelaPedidoVenda();
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

                                <td><input type="checkbox" checked={obs.pedido} disabled /></td>
                                <td><input type="checkbox" checked={obs.nota} disabled /></td>
                                <td><input type="checkbox" checked={obs.registro} disabled /></td>
                                <td><input type="checkbox" checked={obs.financeiro} disabled /></td>

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
                    <button className="btn-adicionar" onClick={() => {
                        if (!cliente) {
                            setModalErro({
                                aberto: true,
                                mensagem: `Selecione um cliente antes de adicionar uma observação!`
                            });
                            return;
                        }
                        if (!operacao.cod_oper) {
                            setModalErro({
                                aberto: true,
                                mensagem: `Selecione uma operação antes de adicionar uma observação!`
                            });
                            return;
                        }
                        if (!CondPgto.cod_cond_pgto) {
                            setModalErro({
                                aberto: true,
                                mensagem: `Selecione uma condição de pagamento antes de adicionar uma observação!`
                            });
                            return;
                        }
                        abrirNovaObs()
                    }
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
                        <FaSearch className="info-icon" onClick={() => setOpenLovCep(true)} />
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
                    <button type="button" className="btn-adicionar" onClick={abrirEmissaoProposta}>
                        Emitir proposta
                    </button>
                    <button type="button" className="btn-adicionar" onClick={abrirSelecaoUnidadesPedido}>
                        Enviar pedido ao ERP
                    </button>
                </div>
            </div>
            <LovUnidadesPedido
                isOpen={openLovUnidadesPedido}
                onClose={() => setOpenLovUnidadesPedido(false)}
                onConfirm={finalizarPedidoErp}
                unidadesDisponiveis={unidadesComItensSelecionados}
            />
            <ModalConfirmacao
                aberto={modalConfirmacaoErp.aberto}
                mensagem={modalConfirmacaoErp.mensagem}
                onConfirmar={confirmarEnvioPedidoErp}
                onCancelar={cancelarEnvioPedidoErp}
            />
            <ModalEmitirProposta
                aberto={modalEmitirProposta}
                carregando={gerandoProposta}
                onSelecionar={emitirProposta}
                onCancelar={() => setModalEmitirProposta(false)}
            />
        </div>
    );
}
