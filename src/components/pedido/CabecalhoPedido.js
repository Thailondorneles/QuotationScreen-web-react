import { FaEraser, FaSearch } from "react-icons/fa";
import { LovClientes } from "../LovClientes.js";
import { LovRepresentantes } from "../LovRepresentantes.js";
import { LovOperacoes } from "../LovOperacoes.js";
import { LovCondPgto } from "../LovCondPgto.js";
import { format } from "../../utils/format.js";

export function CabecalhoPedido({
    sequenciaPedido,
    codClienteDigitado,
    setCodClienteDigitado,
    buscarClientePorCodigo,
    cliente,
    statusHistoricoCliente,
    formatarDataHistoricoCliente,
    historicoCliente,
    setOpenLovPessoas,
    openLovPessoas,
    atualizarCliente,
    setRepresentante,
    setOperacao,
    setCodRepresentanteDigitado,
    setCodCondPgtoDigitado,
    setCodOperacaoDigitado,
    setObservacoes,
    setObsEditando,
    setOpenObsModal,
    codRepresentanteDigitado,
    buscarRepresentantePorCodigo,
    representante,
    setOpenLovRepresentantes,
    openLovRepresentantes,
    codOperacaoDigitado,
    buscarOperacaoPorCodigo,
    operacao,
    setOpenLovOperacoes,
    openLovOperacoes,
    atualizarOperacao,
    codCondPgtoDigitado,
    buscarCondPgtoPorCodigo,
    CondPgto,
    possuiDadosFinanceiros,
    statusCreditoCliente,
    prazoMedioVenda,
    creditoCliente,
    limiteCreditoRuim,
    possuiTitulosVencidos,
    setOpenLovCondPgto,
    openLovCondPgto,
    setCondPgto,
    clienteConsumidor,
    menuModalidadeIntegracaoOpen,
    setMenuModalidadeIntegracaoOpen,
    setMenuOpcaoFreteOpen,
    modalidadeIntegracao,
    setModalidadeIntegracao,
    menuOpcaoFreteOpen,
    setMenuCobrancaFreteOpen,
    opcaoFrete,
    setOpcaoFrete,
    menuCobrancaFreteOpen,
    cobrancaFrete,
    setCobrancaFrete,
    numeroDecimalBR,
    setItensPedido,
    cobrancaCalculada
}) {
    return (
        <div className="pedido-card">
                <h2 className="pedido-title">Pedido de Venda{sequenciaPedido.current ? ` — Cotação ${sequenciaPedido.current}` : ''}</h2>
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
                                        <span className='tip-nome'>Validade alvará:</span>
                                        <span className='tip-valor'>
                                            {formatarDataHistoricoCliente(cliente.dta_validade_alvara)}
                                        </span>
                                    </div>
                                    <div className='tip-linha'>
                                        <span className='tip-nome'>Dias sem compra:</span>
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
                                        setMenuCobrancaFreteOpen(false);
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
                            {opcaoFrete === 'COBRAR_NF' && (
                                <div className="cobranca-frete">
                                    <span>Cobrar do cliente</span>
                                    <div className="seletor-verde-wrap">
                                        <button type="button" className="btn-modalidade-integracao btn-opcao-frete" aria-label="Tipo de cobrança de frete" aria-haspopup="listbox" aria-expanded={menuCobrancaFreteOpen} onClick={() => {
                                            setMenuCobrancaFreteOpen(aberto => !aberto);
                                            setMenuOpcaoFreteOpen(false);
                                            setMenuModalidadeIntegracaoOpen(false);
                                        }}>
                                            {cobrancaFrete.tipo === 'PERCENTUAL' ? '% do custo do frete' : 'Valor total (R$)'}
                                        </button>
                                        {menuCobrancaFreteOpen && (
                                            <div className="modalidade-integracao-menu opcao-frete-menu" role="listbox" aria-label="Tipo de cobrança de frete">
                                                {[['PERCENTUAL', '% do custo do frete'], ['VALOR', 'Valor total (R$)']].map(([tipo, descricao]) => (
                                                    <button key={tipo} type="button" role="option" aria-selected={cobrancaFrete.tipo === tipo} onClick={() => {
                                                        setCobrancaFrete({ tipo, valor: tipo === 'PERCENTUAL' ? '100' : '0' });
                                                        setMenuCobrancaFreteOpen(false);
                                                    }}>{descricao}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input aria-label="Cobrança de frete" inputMode="decimal" value={cobrancaFrete.valor} onChange={event => {
                                        const valor = event.target.value;
                                        if (!/^\d*(?:,\d{0,2})?$/.test(valor)) return;
                                        if (cobrancaFrete.tipo === 'PERCENTUAL' && numeroDecimalBR(valor) > 100) return;
                                        setCobrancaFrete(prev => ({ ...prev, valor }));
                                        setItensPedido(prev => prev.map(item => ({ ...item, sobraDesejada: null })));
                                    }} />
                                    <span>Total a cobrar: {format.moeda(cobrancaCalculada.total)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
    );
}
