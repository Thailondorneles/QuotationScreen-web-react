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
import { cotarSimFrete } from '../config/simFreteService.js'
import { format } from '../utils/format.js'
import { maskMoneyBR } from '../utils/maskMoney.js'


export function PedidoVenda() {
    const [openLovItens, setOpenLovItens] = useState(false);
    const [openLovPessoas, setOpenLovPessoas] = useState(false);
    const [openLovRepresentantes, setOpenLovRepresentantes] = useState(false);
    const [openLovOperacoes, setOpenLovOperacoes] = useState(false);
    const [openLovCondPgto, setOpenLovCondPgto] = useState(false);
    const [openLovTransportadoras, setOpenLovTransportadoras] = useState(false);
    const [cliente, setCliente] = useState(null);
    const [representante, setRepresentante] = useState(null);
    const [operacao, setOperacao] = useState({ cod_oper: null, des_oper: null });
    const [CondPgto, setCondPgto] = useState({ cod_cond_pgto: null, des_cond_pgto: null });
    const [codClienteDigitado, setCodClienteDigitado] = useState('');
    const [codRepresentanteDigitado, setCodRepresentanteDigitado] = useState('');
    const [codOperacaoDigitado, setCodOperacaoDigitado] = useState('');
    const [codCondPgtoDigitado, setCodCondPgtoDigitado] = useState('');
    const [itensPedido, setItensPedido] = useState([]);
    const [modalErro, setModalErro] = useState({
        aberto: false,
        mensagem: '',
        indexItem: null
    });
    const nextId = useRef(1);
    const [cotacoesSimFrete, setCotacoesSimFrete] = useState([]);
    const [freteSelecionado, setFreteSelecionado] = useState({
        201: null,
        203: null
    });

    function adicionarItem(itemLov) {
        const novoItem = {
            seq: nextId.current,            
            cod_item: itemLov.cod_item,
            descricao: itemLov.des_item,
            unidade: null,
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
            impostos: null
        };

        nextId.current += 1;
        setItensPedido(prev => [...prev, novoItem]);
        setOpenLovItens(false);
    }

    const removerItem = (seq) => {
        setItensPedido(prev =>
            prev.filter(item => item.seq !== seq)
        );
    };

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
        alert('Cliente não encontrado');
        setCliente(null);
        return;
        }

        setCliente(cli);
    } catch (error) {
        console.error(error);
        alert('Erro ao buscar cliente');
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
        alert('Representante não encontrado');
        setRepresentante(null);
        return;
        }

        setRepresentante(rep);
    } catch (error) {
        console.error(error);
        alert('Erro ao buscar representante');
    }
    }

    async function buscarEstoqueDisponivel(item) {

        const response = await getEstoqueDisponivel({
            codItem: item.cod_item,
            codUnidade: item.unidade,
            offset: 0,
            limit: 1
        });

        return {
            estoque: response.data.items[0]?.qtd_disponivel ?? 0,
            vlrMedio: response.data.items[0]?.vlr_medio_unitario ?? 0
        };



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
        alert('Operação não encontrada');
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
            alert('Condição de pagamento não encontrada');
            setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
            return;
            }

            setCondPgto(cond);
        } catch (error) {
            console.error(error);
            alert('Erro ao buscar condição de pagamento');
        }
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
        const icms   = valorVendaTotal * (Number(imp.perIcms || 0) / 100);
        const pis    = valorVendaTotal * (Number(imp.perPis || 0) / 100);
        const cofins = valorVendaTotal * (Number(imp.perCofins || 0) / 100);
        const ipi    = valorVendaTotal * (Number(imp.perIpi || 0) / 100);
        const fcp    = valorVendaTotal * (Number(imp.perFcp || 0) / 100);

        let difal = 0;
        let st = 0;

        if( indSubsMercadoria === 1){
            if (imp.difal && imp.difal.toUpperCase().includes('DIF')) {

                const perDifal = Number(imp.perDifal || 0);
                difal = valorVendaTotal * (perDifal / 100);

            }
        
            else {

                // 2.1 — ST por LISTA (prioridade maior que índice)
                if (item.baseST) {
                    const baseTotal = item.baseST * qtd;
                    st = baseTotal * (Number(imp.perSubstTrib || 0) / 100);
                    
                }
                // 2.2 — ST por ÍNDICE
                else if (imp.idxSubsTrib) {

                    const baseTotal = (vlrLista * imp.idxSubsTrib) * qtd;
                    st = baseTotal * (Number(imp.perSubstTrib || 0) / 100);

                }else {
                    const baseTotal = vlrLista * qtd;
                    st = baseTotal * (Number(imp.perSubstTrib || 0) / 100)
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

    async function atualizarItemPorUnidade(index, codUnidade) {
        const novosItens = [...itensPedido];
        const item = { ...novosItens[index] };

        item.unidade = codUnidade;

        // ===== ESTOQUE =====
        const dadosEstoque = await buscarEstoqueDisponivel(item);
        item.estoque = dadosEstoque.estoque;
        item.vlrMedio = dadosEstoque.vlrMedio;

        // ===== IMPOSTOS =====
        const respImp = await getImpostos({
            codOper: operacao.cod_oper,
            codUnidade,
            codPessoa: cliente.cod_pessoa,
            codCondPgto: CondPgto.cod_cond_pgto,
            codItem: item.cod_item
        });

        const imp = respImp.data || {};
        const indSubsMercadoria = Number(imp.ind_subs_mercadoria || 0);

        item.valorLista = Number(imp.vlr_item || 0);
        
        let perDifal = 0
        if (indSubsMercadoria === 1 && imp.txt_refaz_bc_st && imp.txt_refaz_bc_st.toUpperCase().includes('DIF')){
            perDifal =Number(imp.per_subst_trib || 0) - Number(imp.per_icms || 0);
            imp.per_subst_trib = 0
        }

        item.impostos = {
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

        // ===== BASE ST =====
        item.baseST = null;

        // REGRA 1 – ST POR LISTA
        if (item.impostos.indSubsMercadoria === 1 && item.impostos.listaST) {
            const respLista = await getListaPreco({
                lista: item.impostos.listaST,
                item: item.cod_item
            });
            const vlrListaST = respLista?.data?.items?.[0]?.vlr_item;
            item.baseST = Number(vlrListaST ?? item.valorLista ?? 0);
        }
        

        novosItens[index] = item;
        setItensPedido(novosItens);
    }

    function validarMultiplo(index) {
        const item = itensPedido[index];
        const client = cliente;
        const qtd = Number(item.quantidade);
        const multiplo = Number(item.qtdMultiplo);

        if (!qtd || !multiplo) return;

        if (qtd % multiplo !== 0) {
            setModalErro({
                aberto: true,
                mensagem: `Quantidade informada não está de acordo com a quantidade múltipla do item: ${multiplo}.`,
                indexItem: index
                
            });
            const novosItens = [...itensPedido];
            novosItens[index] = { ...item, quantidade: '' };
            setItensPedido(novosItens);
        }

        if (!client) {
            setModalErro({
                aberto: true,
                mensagem: `Cliente não selecionado.`,
                indexItem: index
            });
        }

    }

    async function cotar(itensPedido = [], cliente) {

        if (!cliente) {
            alert('Selecione um cliente antes de cotar');
            return;
        }

        if (!itensPedido.length) {
            alert('Inclua ao menos um item');
            return;
        }

        const itensInvalidos = itensPedido.some(i =>
            !i.unidade || !i.quantidade || Number(i.quantidade) <= 0
        );

        if (itensInvalidos) {
            alert('Todos os itens devem possuir unidade e quantidade válida');
            return;
        }

        try {
            const retorno = await cotarSimFrete(itensPedido, cliente);

            const selecaoAuto = {};
            console.log(retorno)
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
            // Encontrar itens da unidade
            const indicesItensUnidade = [];
            novosItens.forEach((item, index) => {
                if (Number(item.unidade) === Number(unidade)) {
                    indicesItensUnidade.push(index);
                }
            });

            if (indicesItensUnidade.length === 0) return;

            // PASSO 1: Calcular peso de cobrança para cada item
            const pesosCobranca = indicesItensUnidade.map(index => {
                const item = novosItens[index];
                const pesoReal = Number(item.pesoBruto || 0) * Number(item.quantidade || 0);
                const volumeTotal = Number(item.qtdM3 || 0) * Number(item.quantidade || 0);
                const pesoCubado = volumeTotal * FATOR_CUBAGEM;
                
                // O transporte cobra pelo MAIOR entre peso real e peso cubado
                return Math.max(pesoReal, pesoCubado);
            });

            // PASSO 2: Calcular total de peso de cobrança
            const totalPesoCobranca = pesosCobranca.reduce((s, peso) => s + peso, 0);

            // PASSO 3: Ratear proporcionalmente ao peso de cobrança
            indicesItensUnidade.forEach((itemIndex, i) => {
                if (totalPesoCobranca > 0) {
                    const proporcao = pesosCobranca[i] / totalPesoCobranca;
                    const valorRateado = proporcao * Number(frete.valor);
                    novosItens[itemIndex].valorFrete = Number(valorRateado.toFixed(2));
                } else {
                    novosItens[itemIndex].valorFrete = 0;
                }
            });
        });

        setItensPedido(novosItens);
    }

    useEffect(() => {
    if (!cliente) {
        setRepresentante(null);
        setOperacao({ cod_oper: null, des_oper: null });
        setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null });
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
    }

    carregarDados();
    }, [cliente]);

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
                        onChange={(e) => {setCodClienteDigitado(e.target.value);}} 
                        onBlur={() => buscarClientePorCodigo(codClienteDigitado)} 
                    />
                    <input type="text" className='input-desc' value={cliente?.des_pessoa || ''} readOnly/>
                    <FaSearch className="icon" onClick={() => setOpenLovPessoas(true)} />
                    <LovClientes 
                        isOpen={openLovPessoas} 
                        setLovOpen={() => setOpenLovPessoas(!openLovPessoas)} 
                        onSelect={(cli) => { setCliente(cli); setRepresentante(null); setCodClienteDigitado(cli.cod_pessoa); }}
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
                    <input type="text" className='input-desc' value={representante?.des_pessoa || ''} readOnly/>
                    <FaSearch className="icon" onClick={() => {if (!cliente) { alert('Selecione um cliente primeiro'); return; } setOpenLovRepresentantes(true); }} />
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
                    <input type="text" className='input-desc' value={operacao.des_oper || ''} readOnly/>
                    <FaSearch className="icon" onClick={() => {if (!cliente) { alert('Selecione um cliente primeiro'); return; } setOpenLovOperacoes(true); }} />
                    <LovOperacoes 
                        isOpen={openLovOperacoes} 
                        setLovOpen={() => setOpenLovOperacoes(!openLovOperacoes)} 
                        onSelect={(op) => {setOperacao({ cod_oper: op.cod_oper, des_oper: op.des_oper }); setCodOperacaoDigitado(op.cod_oper);}} 
                     />
                     <FaEraser className="icon" onClick={() => {setOperacao({ cod_oper: null, des_oper: null }); setCodOperacaoDigitado('');}} />
                </div>

                {/* Condição pagamento */}
                <label>Cond. pgto.:</label>
                <div className="field-group full" >
                    <input type="text" className='input-cod' value={codCondPgtoDigitado} 
                        onChange={(e) => setCodCondPgtoDigitado(e.target.value)} 
                        onBlur={() => buscarCondPgtoPorCodigo(codCondPgtoDigitado)} 
                    />
                    <input type="text" className='input-desc' value={CondPgto.des_cond_pgto || ''} readOnly/>
                    <FaSearch className="icon" onClick={() => {if (!cliente) { alert('Selecione um cliente primeiro'); return; } setOpenLovCondPgto(true); }} />
                    <LovCondPgto 
                        isOpen={openLovCondPgto} 
                        setLovOpen={() => setOpenLovCondPgto(!openLovCondPgto)} 
                        onSelect={(cond) => {
                            setCondPgto({ cod_cond_pgto: cond.cod_cond_pgto, des_cond_pgto: cond.des_cond_pgto }); 
                            setCodCondPgtoDigitado(cond.cod_cond_pgto);
                        }}
                    />
                    <FaEraser className="icon" onClick={() => {setCondPgto({ cod_cond_pgto: null, des_cond_pgto: null }); setCodCondPgtoDigitado('');}} />
                </div>

                <div></div> {/* Espaço vazio para alinhamento */}
            </div>
        </div>
        <div className="item-card">
            <h2 className="pedido-title">Itens do Pedido</h2>
            {itensPedido.length > 0 && (
                <table className="itens-grid">
                    <thead>
                    <tr>
                        <th>Seq</th>
                        <th>Código</th>
                        <th>Item</th>
                        <th>Unidade</th>
                        <th>Estoque</th>
                        <th>Quantidade</th>
                        <th>Valor Lista</th>
                        <th>Valor Total</th>
                        <th>Custo Médio</th>
                        <th>CMV</th>
                        <th>Sobra</th>
                    </tr>
                    </thead>

                    <tbody>
                    {itensPedido.map((item, index) => {
                        
                        const valores = calcularValoresItem(item);
                        return(

                        <tr key={item.seq}>
                        <td>{item.seq}</td>
                        <td>{item.cod_item}</td>
                        <td>{item.descricao}</td>

                        {/* Unidade */}
                        <td>
                            <select
                                value={item.unidade || ''}
                                onChange={(e) => atualizarItemPorUnidade(index, Number(e.target.value))}
                            >
                                <option value="">Selecione</option>
                                <option value="201">201</option>
                                <option value="203">203</option>
                            </select>


                        </td>
                        <td>{item.estoque}</td>
                        {/* Quantidade */}
                        <td>
                            <input 
                                value={item.quantidade.toLocaleString('pt-BR')}
                                onChange={(e) => {
                                    const novosItens = [...itensPedido];
                                    novosItens[index].quantidade = e.target.value;
                                    setItensPedido(novosItens);
                                }}
                                onBlur={() => validarMultiplo(index)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.target.blur(); // força validação
                                    }
                                }} 
                            />
                            <ModalErro
                                aberto={modalErro.aberto}
                                mensagem={modalErro.mensagem}
                                onClose={() => {
                                    setModalErro({ aberto: false, mensagem: '', indexItem: null });

                                    // devolve foco ao input
                                    setTimeout(() => {
                                        const inputs = document.querySelectorAll('input[type="number"]');
                                        if (modalErro.indexItem !== null) {
                                            inputs[modalErro.indexItem]?.focus();
                                        }
                                    }, 0);
                                }}
                            />
                            {item.erroQtd && (
                                <div className="mensagem-erro">
                                    {item.erroQtd}
                                </div>
                            )}
                        </td> 
                        <td><input value = {item.valorLista}
                        onChange={(e) => {
                                    const v = maskMoneyBR(e.target.value)
                                    const novosItens = [...itensPedido];
                                    novosItens[index].valorLista = v;
                                    setItensPedido(novosItens);
                                }}/></td>
                        <td>{format.moeda(valores.valorVendaTotal ?? 0)}</td>
                        <td>{format.moeda(item.vlrMedio ?? 0)}</td>
                        <td>{format.percentual(valores.cmv ?? 0)}</td>
                        <td
                            style={{
                                color: valores.sobraReal >= 0 ? 'green' : 'red',
                                fontWeight: 'bold'
                            }}
                        >
                            {format.moeda(valores.sobraReal ?? 0)}
                        </td>
                        <td className="info-cell">
                        <IoInformationOutline className="icon info-icon" />

                        <div className="tooltip-info">
                            <strong>Detalhes do Item</strong>

                            <div>
                                <span className='tip-nome'>ICMS:</span>
                                <span className='tip-percent'>{format.percentual(item.impostos?.perIcms)}</span>
                                <span className='tip-valor'>{format.moeda(valores.icms ?? 0)}</span>
                            </div>

                            <div>
                                ICMS ST: R$ {(valores.st ?? 0)}
                                {' '}({item.impostos?.perSubstTrib}%)
                            </div>

                            <div>
                                DIFAL: R$ {(valores.difal ?? 0)}
                                {' '}({item.impostos?.perDifal}%)
                            </div>

                            <div>
                                PIS: R$ {(valores.pis ?? 0)}
                                {' '}({item.impostos?.perPis}%)
                            </div>

                            <div>
                                COFINS: R$ {(valores.cofins ?? 0)}
                                {' '}({item.impostos?.perCofins}%)
                            </div>

                            <div>
                                IPI: R$ {(valores.ipi ?? 0)}
                                {' '}({item.impostos?.perIpi}%)
                            </div>

                            <div>
                                FCP: R$ {(valores.fcp ?? 0)}
                                {' '}({item.impostos?.perFcp}%)
                            </div>

                            <div>
                                Frete rateado: R$ {(item.valorFrete ?? 0)}
                            </div>

                            <hr />
                        </div>

                        </td>

                        <td><FaTrash className="icon" onClick={()=> removerItem(item.seq)}/></td>
                        </tr>
                    )})}
                    </tbody>
                </table>
                )}
                <div className="item-card-container">
                <button className="btn-adicionar-item" onClick={() => setOpenLovItens(true)}>+ Item</button>
                <button className="btn-cotar-simfrete" onClick={() => cotar(itensPedido, cliente)}>Cotar SimFrete</button>
            </div>
            <LovItens 
                isOpen={openLovItens} 
                setLovOpen={() => setOpenLovItens(!openLovItens)} 
                onSelect={(item) => adicionarItem(item)} 
            />
            <LovTransportadoras
                isOpen={openLovTransportadoras}
                cotacoes={cotacoesSimFrete}
                selecionados={freteSelecionado}
                onConfirm={confirmarSelecaoFrete}
                onClose={() => setOpenLovTransportadoras(false)}
            />
        </div>
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
    );
}