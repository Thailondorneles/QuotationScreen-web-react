import { parametros } from "../../config/parametrosAplicacao";
import { NotasItemCliente } from "../NotasItemCliente";
import { FaTrash, FaHourglassHalf, FaUpload } from "react-icons/fa";
import { ModalImportarItens } from "../ModalImportarItens";
import { LovItens } from "../LovItens.js";
import { IoInformationOutline } from "react-icons/io5";
import { format } from "../../utils/format.js";
import { maskMoneyBR, formatarMilharesBR } from "../../utils/maskMoney.js";
import LoadingOverlay from "../LoadingOverlay.js";

export function ItensPedido({
    loading,
    loadingDadosCliente,
    setImportacaoAberta,
    recalcularItensManualmente,
    itensPedido,
    importacaoAberta,
    importarItensExcel,
    itensAgrupadosOrdenados,
    itemPossuiAcordo,
    itemPossuiPrecoListaBloqueado,
    itemPossuiUltimaCompra,
    itemSemTributacao,
    lotesProximosMap,
    getDestaqueClassificacao,
    getClasseLinhaItem,
    removerItem,
    setMenuSelecaoItensOpen,
    menuSelecaoItensOpen,
    selecionarItensPorUnidade,
    calcularValoresItem,
    handleCheckboxChange,
    handleQuantidadeChange,
    validarMultiplo,
    navegarCamposItens,
    valorListaEmEdicao,
    setValorListaEmEdicao,
    handleValorListaChange,
    validarValorListaPromocional,
    handleSobraPercentualChange,
    aplicarSobraPercentual,
    cliente,
    setModalErro,
    operacao,
    CondPgto,
    setOpenLovItens,
    cotar,
    openLovItens,
    ultimasComprasClienteMap,
    notasCliente,
    adicionarItem,
    ordenacaoItens,
    alternarOrdenacaoItens,
    totaisPorUnidade,
    freteSelecionado,
    opcaoFrete,
    cobrancaCalculada,
    cotacoesFrete,
    selecionarTransportadora,
    formatarDataUltimaCompraItem,
    getPedidosAcordoTexto,
    getCodigoUnidadeCompra,
    formatarDataHistoricoCliente
}) {
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
                    {opcaoFrete === 'COBRAR_NF' && <small>Cobrar do cliente: {format.moeda(cobrancaCalculada.porUnidade[unidade] || 0)}</small>}
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
                                                const isSel = Boolean(freteSelecionado[unidade] && String(freteSelecionado[unidade].cnpj) === String(t.cnpj) && Number(freteSelecionado[unidade].valor) === Number(t.valor));
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
                opcaoFrete === 'COBRAR_NF' && Number(imp.indIcmsFreteSoma) === 1 && componente('Frete'),
                Number(imp.indIcmsIpiSoma) === 1 && componente('IPI'),
                Number(imp.indIcmsPisSoma) === 1 && componente('PIS'),
                Number(imp.indIcmsCofinsSoma) === 1 && componente('COFINS')
            )},
            { nome: 'PIS/COFINS', componentes: componentesAtivos(
                componente('Venda', 'base'),
                opcaoFrete === 'COBRAR_NF' && Number(imp.indPiscofFreteSoma) === 1 && componente('Frete'),
                Number(imp.indPiscofIpiSoma) === 1 && componente('IPI'),
                Number(imp.indPiscofIcmsAbate) === 1 && componente('ICMS', 'abate')
            )},
            { nome: 'IPI', componentes: componentesAtivos(
                componente('Venda', 'base'),
                opcaoFrete === 'COBRAR_NF' && Number(imp.indIpiFreteSoma) === 1 && componente('Frete')
            )},
            Number(imp.indSubsMercadoria) === 1 && {
                nome: imp.difal?.toUpperCase().includes('DIF') ? 'DIFAL' : 'ICMS ST',
                componentes: componentesAtivos(
                    componente(item.baseST ? 'Lista ST' : imp.idxSubsTrib ? 'Venda × índice' : 'Venda', 'base'),
                    opcaoFrete === 'COBRAR_NF' && Number(imp.indSubsFreteSoma) === 1 && componente('Frete'),
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
                    <div className="tip-linha"><span className="tip-nome">Frete cobrado:</span><span className="tip-valor">{format.moeda(cobrancaCalculada.porItem[item.seq] || 0)}</span></div>
                    <div className="tip-linha"><span className="tip-nome">Prazo:</span><span className="tip-valor">{freteItem?.prazo != null ? `${freteItem.prazo} dias` : '-'}</span></div>
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
                            {item.ultimaCompraItemDasUltimasCompras.slice(0, parametros.HISTORICO_COMPRAS_POR_ITEM).map((compra, index) => (
                                <div className="historico-compra-linha" key={`${compra.dta_emissao}-${compra.vlr_unitario}-${index}`}>
                                    {getCodigoUnidadeCompra(compra)} - {formatarDataHistoricoCliente(compra.dta_emissao)} - {format.moeda(compra.vlr_unitario)} - Qtd.: {compra.qtd_lancamento != null ? Number(compra.qtd_lancamento).toLocaleString('pt-BR', { maximumFractionDigits: 4 }) : '-'}
                                </div>
                            ))}
                        </div>
                    )}
                   <NotasItemCliente consulta={notasCliente} codCliente={cliente?.cod_pessoa} codItem={item.cod_item} />
                </div>
            </div>
        );
    }

    return (
        <div className="item-card">
                <div className="pedido-title item-card-title-actions">
                    <h2>Itens do Pedido</h2>
                    <div className="itens-acoes-botoes">
                    <button type="button" className="btn-recalcular-itens" title="Importar itens do Excel"
                        aria-label="Importar itens do Excel" disabled={loading || loadingDadosCliente}
                        onClick={() => setImportacaoAberta(true)}><FaUpload /></button>
                    <button
                        type="button"
                        className="btn-recalcular-itens"
                        onClick={recalcularItensManualmente}
                        disabled={loading || loadingDadosCliente || !itensPedido.length}
                    >
                        Recalcular itens
                    </button>
                    </div>
                </div>
                {importacaoAberta && <ModalImportarItens onClose={() => setImportacaoAberta(false)} onImportar={importarItensExcel} />}
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
                                                <div><span className="itens-legenda-segmento">AC</span><strong>{parametros.SOBRA_MINIMA_AC_ITEM}%</strong></div>
                                                <div><span className="itens-legenda-segmento">MMT</span><strong>{parametros.SOBRA_MINIMA_MMT_ITEM}%</strong></div>
                                                <div><span className="itens-legenda-segmento">Total da unidade</span><strong>{parametros.SOBRA_MINIMA_TOTAL_GERAL}% (somente AC: {parametros.SOBRA_MINIMA_TOTAL_AC}%)</strong></div>
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
                            <section className="tabela-itens-bloco tabela-unidade-resumo" data-unidade={config.unidade} key={config.unidade}>
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
                                                    <td><input className="item-table-input item-table-money" data-field="valor-lista" data-unidade={item.unidade} data-seq={item.seq} value={valorListaEmEdicao === item.seq ? item.valorLista : formatarMilharesBR(item.valorLista)} disabled={item.precoListaBloqueado} title={item.precoListaBloqueado ? 'Preço bloqueado por contrato' : item.precoListaPromocional ? 'Preço promocional: permitido somente aumentar' : undefined} onFocus={e => { setValorListaEmEdicao(item.seq); e.target.select(); }} onChange={(e) => handleValorListaChange(item.seq, maskMoneyBR(e.target.value, 4))} onBlur={() => { setValorListaEmEdicao(null); validarValorListaPromocional(item.seq); }} onKeyDown={navegarCamposItens} /></td>
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
                    notasCliente={notasCliente}
                    onSelect={(item) => adicionarItem(item)}
                />
                <LoadingOverlay isOpen={loading || loadingDadosCliente} />

            </div>
    );
}
