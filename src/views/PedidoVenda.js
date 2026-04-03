import '../style/pedidoVenda.css';
import { FaEraser, FaSearch, FaTrash } from "react-icons/fa";
import { useState } from 'react';
import { useEffect } from 'react';
import { LovItens } from '../components/LovItens.js';
import { LovClientes } from '../components/LovClientes.js';
import { LovRepresentantes } from '../components/LovRepresentantes.js';
import { LovOperacoes } from '../components/LovOperacoes.js';
import { LovCondPgto } from '../components/LovCondPgto.js';
import { LovTransportadoras } from '../components/LovTransportadoras.js';
import { getRepresentantesByCliente, getRepresentantesByIdCliente } from '../services/representantes.js';
import { getClienteByFilter } from '../services/clientes.js';
import { getCondPgtoByFilter } from '../services/condPgto.js';
import { getOperacoesByFilter } from '../services/operacoes.js';
import { getEstoqueDisponivel } from '../services/estoqueDisponivel.js';
import { IoInformationOutline } from "react-icons/io5";
import { getImpostos } from '../services/impostos.js';
import { ModalErro } from '../components/ModalErro.js';
import { getListaPreco } from '../services/listaPreco.js';
import { useRef } from 'react';
import { cotarSimFrete } from '../config/simFreteService.js';
import { format } from '../utils/format.js';
import { maskMoneyBR } from '../utils/maskMoney.js';
import LoadingOverlay from '../components/LoadingOverlay.js';
import { LovObservacao } from '../components/LovObservacao.js';
import { getClientesComentarios } from '../services/clientes.js';

export function PedidoVenda() {
    const [openLovItens, setOpenLovItens] = useState(false);
    const [openLovPessoas, setOpenLovPessoas] = useState(false);
    const [openLovTriangulacao, setOpenLovTriangulacao] = useState(false);
    const [openLovRepresentantes, setOpenLovRepresentantes] = useState(false);
    const [openLovOperacoes, setOpenLovOperacoes] = useState(false);
    const [openLovCondPgto, setOpenLovCondPgto] = useState(false);
    const [openLovTransportadoras, setOpenLovTransportadoras] = useState(false);
    const [cliente, setCliente] = useState(null);
    const [clienteTriangulacao, setClienteTriangulacao] = useState(null);
    const [representante, setRepresentante] = useState(null);
    const [operacao, setOperacao] = useState({ cod_oper: null, des_oper: null });
    const [CondPgto, setCondPgto] = useState({ cod_cond_pgto: null, des_cond_pgto: null });
    const [codClienteDigitado, setCodClienteDigitado] = useState('');
    const [codClienteTriangulacaoDigitado, setCodClienteTriangulacaoDigitado] = useState('');
    const [codRepresentanteDigitado, setCodRepresentanteDigitado] = useState('');
    const [codOperacaoDigitado, setCodOperacaoDigitado] = useState('');
    const [codCondPgtoDigitado, setCodCondPgtoDigitado] = useState('');
    const [itensPedido, setItensPedido] = useState([]);
    const [modalErro, setModalErro] = useState({
        aberto: false,
        mensagem: '',
        seqItem: null,
        focusSelector: null
    });
    const nextId = useRef(1);
    const [cotacoesSimFrete, setCotacoesSimFrete] = useState([]);
    const [freteSelecionado, setFreteSelecionado] = useState({
        201: null,
        203: null
    });
    const [loading, setLoading] = useState(false);
    const [observacoes, setObservacoes] = useState([]);
    const [openObsModal, setOpenObsModal] = useState(false);
    const [obsEditando, setObsEditando] = useState(null);
    const [ordemCompra, setOrdemCompra] = useState('');

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

    async function buscarDadosItem(item) {
        // Busca estoque disponível
        const responseEstoque = await getEstoqueDisponivel({
            codItem: item.cod_item,
            codUnidade: item.unidade,
            offset: 0,
            limit: 1
        });
        const estoque = responseEstoque.data.items[0]?.qtd_disponivel ?? 0;
        const vlrMedio = responseEstoque.data.items[0]?.vlr_medio_unitario ?? 0;
        // Busca impostos
        const respImp = await getImpostos({
            codOper: operacao.cod_oper,
            codUnidade: item.unidade,
            codPessoa: cliente.cod_pessoa,
            codCondPgto: CondPgto.cod_cond_pgto,
            codItem: item.cod_item
        });

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
            valorLista,
            impostos,
            baseST
        };
    }

    async function adicionarItem(itemLov) {

        const grupoId = nextId.current; 
        const itemBase = {
            grupoId,
            cod_item: itemLov.cod_item,
            descricao: itemLov.des_item,
            qtdMultiplo: itemLov.qtd_multiplo,
            qtdAltura: itemLov.qtd_altura,
            qtdLargura: itemLov.qtd_largura,
            qtdComprimento: itemLov.qtd_comprimento,
            qtdM3: itemLov.qtd_m3,
            qtdM2: itemLov.qtd_m2,
            pesoBruto: itemLov.qtd_peso_bruto,
            quantidade: '',
            estoque: 0,
            vlrMedio: 0,
            valorLista: 0,
            cmv: 0,
            impostos: null,
            baseST: null,
            selecionado: false,
            valorFrete: 0
        };
        console.log(itemBase)

        // Cria os dois itens (201 e 203)
        const item201 = { ...itemBase, seq: nextId.current, unidade: 201 };
        const item203 = { ...itemBase, seq: nextId.current + 1, unidade: 203 };
        nextId.current += 2; // avança o contador

        // Adiciona os itens ao estado (com dados vazios)
        setItensPedido(prev => [...prev, item201, item203]);

        // Busca dados completos para cada item e atualiza
        try {
            const [dados201, dados203] = await Promise.all([
                buscarDadosItem(item201),
                buscarDadosItem(item203)
            ]);

            setItensPedido(prev =>
                prev.map(item => {
                    if (item.seq === item201.seq) return { ...item, ...dados201 };
                    if (item.seq === item203.seq) return { ...item, ...dados203 };
                    return item;
                })
            );
        } catch (error) {
            console.error('Erro ao carregar dados dos itens:', error);
            alert('Erro ao carregar informações de estoque ou impostos para o item adicionado.');
        }

        setOpenLovItens(false);
    }

    function removerItem(seq) {
        setItensPedido(prev => prev.filter(item => item.seq !== seq));
    }

    function handleQuantidadeChange(seq, valor) {
        setItensPedido(prev =>
            prev.map(item =>
                item.seq === seq ? { ...item, quantidade: valor } : item
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
                seqItem: seq
            });
            // Limpa a quantidade do item com erro
            handleQuantidadeChange(seq, '');
        }
    }

    function handleCheckboxChange(seq, checked) {
        setItensPedido(prev =>
            prev.map(item =>
                item.seq === seq ? { ...item, selecionado: checked } : item
            )
        );
    }

    function calcularValoresItem(item) {
        const qtd = Number(item.quantidade || 0);
        const vlrLista = Number(item.valorLista || 0);
        const vlrMedio = Number(item.vlrMedio || 0);

        if (!qtd || !vlrLista) {
            return {
                valorVendaTotal: 0,
                valorCustoTotal: 0,
                sobraReal: 0,
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

        const sobraBruta = valorVendaTotal - valorCustoTotal;
        const frete = Number(item.valorFrete || 0);
        const sobraReal = sobraBruta - totalImpostos - frete;
        const cmv = valorVendaTotal > 0 ? (valorCustoTotal / valorVendaTotal) * 100 : 0;
        return {
            valorVendaTotal,
            valorCustoTotal,
            cmv,
            icms,
            pis,
            cofins,
            ipi,
            difal,
            st,
            fcp,
            totalImpostos,
            sobraBruta,
            sobraReal
        };
    }

    async function buscarClientePorCodigo() {
        if (!codClienteDigitado) return;
        try {
            const response = await getClienteByFilter({
                filtro: codClienteDigitado,
                offset: 0,
                limit: 1
            });
            const cli = response.data.items[0];
            if (!cli) {
                setModalErro({
                    aberto: true,
                    mensagem: 'Cliente não encontrato com o código digitado!'
                });
                setCliente(null);
                return;
            }
            setCliente(cli);
        } catch (error) {
            console.error(error);
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
            console.error(error);
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
            console.error(error);
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
            console.error(error);
            alert('Erro ao buscar operação');
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
            console.error(error);
            alert('Erro ao buscar condição de pagamento');
        }
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

            try {
                const retorno = await cotarSimFrete(itensSelecionados, cliente);

                const selecaoAuto = {};
                retorno.forEach(r => {
                    if (r.transportadoras.length === 1) {
                        selecaoAuto[r.unidade] = r.transportadoras[0];
                    }
                });

                if (Object.keys(selecaoAuto).length === retorno.length) {
                    confirmarSelecaoFrete(selecaoAuto);
                    return;
                }

                setCotacoesSimFrete(retorno);
                setOpenLovTransportadoras(true);

            } catch (err) {
                console.error(err);
                alert(err.message || 'Erro ao cotar frete');
            }
        }catch (err){
            console.error(err);
            alert(err.message || 'Erro ao cotar frete');
        }finally{
            setLoading(false);
        }
    }

    function confirmarSelecaoFrete(selecionados) {
        setFreteSelecionado(selecionados);
        setOpenLovTransportadoras(false);
        aplicarRateioFrete(selecionados);
    }

    function aplicarRateioFrete(selecionados) {
        const FATOR_CUBAGEM = 300; // 1 m³ = 300 kg
        let novosItens = [...itensPedido];

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

        setItensPedido(novosItens);
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
            console.error('Erro ao buscar observações do cliente:', error);
        }
    }

    useEffect(() => {
        if (!cliente) {
            setRepresentante(null);
            setOperacao({ cod_oper: null, des_oper: null });
            setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
            setObservacoes([]);
            setObsEditando(null);
            setOpenObsModal(false);
            return;
        }

        async function carregarDados() {
            const response = await getRepresentantesByCliente({
                filtro: cliente.cod_pessoa,
                offset: 0,
                limit: 25
            });

            const responseOper = await getClienteByFilter({
                filtro: cliente.cod_pessoa,
                offset: 0,
                limit: 25
            });

            const responseCondPgto = await getClienteByFilter({
                filtro: cliente.cod_pessoa,
                offset: 0,
                limit: 25
            });

            setRepresentante(response.data.items[0] || null);
            setCodRepresentanteDigitado(response.data.items[0]?.cod_pessoa_rep || '');
            setOperacao({
                cod_oper: responseOper.data.items[0]?.cod_oper || null,
                des_oper: responseOper.data.items[0]?.des_oper || null
            });
            setCodOperacaoDigitado(responseOper.data.items[0]?.cod_oper || '');
            setCondPgto({
                cod_cond_pgto: responseCondPgto.data.items[0]?.cod_cond_pgto || null,
                des_cond_pgto: responseCondPgto.data.items[0]?.des_cond_pgto || null
            });
            setCodCondPgtoDigitado(responseCondPgto.data.items[0]?.cod_cond_pgto || '');

            await carregarObservacoesCliente(cliente.cod_pessoa);
        }

        carregarDados();
    }, [cliente]);

    const itens201 = itensPedido.filter(item => item.unidade === 201);
    const itens203 = itensPedido.filter(item => item.unidade === 203);

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
                        <FaSearch className="icon" onClick={() => setOpenLovPessoas(true)} />
                        <LovClientes
                            isOpen={openLovPessoas}
                            setLovOpen={() => setOpenLovPessoas(!openLovPessoas)}
                            onSelect={(cli) => { console.log(cli); setCliente(cli); setRepresentante(null); setCodClienteDigitado(cli.cod_pessoa); }}
                        />
                        <FaEraser className="icon"
                            onClick={() => {
                                setCliente(null);
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
                <div className="tabelas-container">
                    {/* Tabela Unidade 201 */}
                    <div className="tabela-unidade">
                        <h3>Unidade 201 (Matriz)</h3>
                        <table className="itens-grid">
                            <thead>
                                <tr>
                                    <th>Sel.</th>
                                    <th>Seq</th>
                                    <th>Código</th>
                                    <th>Item</th>
                                    <th>Estoque</th>
                                    <th>Quantidade</th>
                                    <th>Valor Lista</th>
                                    <th>Valor Total</th>
                                    <th>Custo Médio</th>
                                    <th>CMV</th>
                                    <th>Sobra</th>
                                    <th>Info</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {itens201.map(item => {
                                    const valores = calcularValoresItem(item);
                                    return (
                                        <tr key={item.seq}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={item.selecionado}
                                                    onChange={(e) => handleCheckboxChange(item.seq, e.target.checked)}
                                                />
                                            </td>
                                            <td>{item.seq}</td>
                                            <td>{item.cod_item}</td>
                                            <td>{item.descricao}</td>
                                            <td>{item.estoque}</td>
                                            <td>
                                                <input
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
                                                    value={item.valorLista}
                                                    onChange={(e) => {
                                                        const v = maskMoneyBR(e.target.value);
                                                        handleValorListaChange(item.seq, v);
                                                    }}
                                                />
                                            </td>
                                            <td>{format.moeda(valores.valorVendaTotal ?? 0)}</td>
                                            <td>{format.moeda(item.vlrMedio ?? 0)}</td>
                                            <td>{format.percentual(valores.cmv ?? 0)}</td>
                                            <td style={{ color: valores.sobraReal >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                                                {format.moeda(valores.sobraReal ?? 0)}
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
                                                        <span className='tip-nome'>Frete rateado:</span> 
                                                        <span className='tip-valor'>{format.moeda(item.valorFrete ?? 0)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><FaTrash className="icon" onClick={() => removerItem(item.seq)} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Tabela Unidade 203 */}
                    <div className="tabela-unidade">
                        <h3>Unidade 203 (Filial)</h3>
                        <table className="itens-grid">
                            <thead>
                                <tr>
                                    <th>Sel.</th>
                                    <th>Seq</th>
                                    <th>Código</th>
                                    <th>Item</th>
                                    <th>Estoque</th>
                                    <th>Quantidade</th>
                                    <th>Valor Lista</th>
                                    <th>Valor Total</th>
                                    <th>Custo Médio</th>
                                    <th>CMV</th>
                                    <th>Sobra</th>
                                    <th>Info</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {itens203.map(item => {
                                    const valores = calcularValoresItem(item);
                                    return (
                                        <tr key={item.seq}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={item.selecionado}
                                                    onChange={(e) => handleCheckboxChange(item.seq, e.target.checked)}
                                                />
                                            </td>
                                            <td>{item.seq}</td>
                                            <td>{item.cod_item}</td>
                                            <td>{item.descricao}</td>
                                            <td>{item.estoque}</td>
                                            <td>
                                                <input
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
                                                    value={item.valorLista}
                                                    onChange={(e) => {
                                                        const v = maskMoneyBR(e.target.value);
                                                        handleValorListaChange(item.seq, v);
                                                    }}
                                                />
                                            </td>
                                            <td>{format.moeda(valores.valorVendaTotal ?? 0)}</td>
                                            <td>{format.moeda(item.vlrMedio ?? 0)}</td>
                                            <td>{format.percentual(valores.cmv ?? 0)}</td>
                                            <td style={{ color: valores.sobraReal >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                                                {format.moeda(valores.sobraReal ?? 0)}
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
                                                        <span className='tip-nome'>Frete rateado:</span> 
                                                        <span className='tip-valor'>{format.moeda(item.valorFrete ?? 0)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><FaTrash className="icon" onClick={() => removerItem(item.seq)} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

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
                    onSelect={(item) => adicionarItem(item)}
                />
                <LoadingOverlay isOpen={loading} />
                <LovTransportadoras
                    isOpen={openLovTransportadoras}
                    cotacoes={cotacoesSimFrete}
                    selecionados={freteSelecionado}
                    onConfirm={confirmarSelecaoFrete}
                    onClose={() => setOpenLovTransportadoras(false)}
                />

                {Object.values(freteSelecionado).some(v => v) && (
                    <div className="frete-resumo">
                        {Object.entries(freteSelecionado).map(([u, f]) =>
                            f ? (
                                <div key={u}>
                                    <strong>Unidade {u}</strong> — {f.nome} — R$ {f.valor} — {f.prazo} dias
                                </div>
                            ) : null
                        )}
                    </div>
                )}
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
            </div>
    
        </div>
    );
}
