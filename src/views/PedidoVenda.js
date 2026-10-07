import '../components/pedido/estilos';
import { useLocation } from 'react-router-dom';
import { ModalErro } from '../components/ModalErro.js';
import LoadingOverlay from '../components/LoadingOverlay.js';
import { LovUnidadesPedido } from '../components/LovUnidadesPedido.js';
import { ModalConfirmacao } from '../components/ModalConfirmacao.js';
import { ModalEmitirProposta } from '../components/ModalEmitirProposta.js';
import { usePedidoVenda } from '../hooks/pedido/usePedidoVenda';
import { CabecalhoPedido } from '../components/pedido/CabecalhoPedido';
import { ItensPedido } from '../components/pedido/ItensPedido';
import { ObservacoesPedido } from '../components/pedido/ObservacoesPedido';
import { OrdemCompraPedido } from '../components/pedido/OrdemCompraPedido';
import { TriangulacaoPedido } from '../components/pedido/TriangulacaoPedido';
import { EnderecoEntregaPedido } from '../components/pedido/EnderecoEntregaPedido';
import { AcoesPedido } from '../components/pedido/AcoesPedido';

export function PedidoVenda() {
    const location = useLocation();
    return <FormularioPedidoVenda key={location.key} />;
}

function FormularioPedidoVenda() {
    const pedido = usePedidoVenda();
    const { carregandoPedido, erroCarregamentoPedido, navigate, location, modalErro, setModalErro, modalSucesso, setModalSucesso, limparTelaPedidoVenda, openLovUnidadesPedido, setOpenLovUnidadesPedido, finalizarPedidoErp, unidadesComItensSelecionados, modalConfirmacaoErp, confirmarEnvioPedidoErp, cancelarEnvioPedidoErp, modalEmitirProposta, gerandoProposta, emitirProposta, setModalEmitirProposta } = pedido;

    if (carregandoPedido) return <LoadingOverlay isOpen />;
    if (erroCarregamentoPedido) return <div className="pedido-venda-container"><div className="pedido-card">
        <p role="alert">{erroCarregamentoPedido}</p>
        <button className="btn-adicionar" onClick={() => navigate(`/${location.search}`)}>Voltar para pedidos</button>
    </div></div>;

    return (
        <div className="pedido-venda-container">
            <CabecalhoPedido
                sequenciaPedido={pedido.sequenciaPedido}
                codClienteDigitado={pedido.codClienteDigitado}
                setCodClienteDigitado={pedido.setCodClienteDigitado}
                buscarClientePorCodigo={pedido.buscarClientePorCodigo}
                cliente={pedido.cliente}
                statusHistoricoCliente={pedido.statusHistoricoCliente}
                formatarDataHistoricoCliente={pedido.formatarDataHistoricoCliente}
                historicoCliente={pedido.historicoCliente}
                setOpenLovPessoas={pedido.setOpenLovPessoas}
                openLovPessoas={pedido.openLovPessoas}
                atualizarCliente={pedido.atualizarCliente}
                setRepresentante={pedido.setRepresentante}
                setOperacao={pedido.setOperacao}
                setCodRepresentanteDigitado={pedido.setCodRepresentanteDigitado}
                setCodCondPgtoDigitado={pedido.setCodCondPgtoDigitado}
                setCodOperacaoDigitado={pedido.setCodOperacaoDigitado}
                setObservacoes={pedido.setObservacoes}
                setObsEditando={pedido.setObsEditando}
                setOpenObsModal={pedido.setOpenObsModal}
                codRepresentanteDigitado={pedido.codRepresentanteDigitado}
                buscarRepresentantePorCodigo={pedido.buscarRepresentantePorCodigo}
                representante={pedido.representante}
                setOpenLovRepresentantes={pedido.setOpenLovRepresentantes}
                openLovRepresentantes={pedido.openLovRepresentantes}
                codOperacaoDigitado={pedido.codOperacaoDigitado}
                buscarOperacaoPorCodigo={pedido.buscarOperacaoPorCodigo}
                operacao={pedido.operacao}
                setOpenLovOperacoes={pedido.setOpenLovOperacoes}
                openLovOperacoes={pedido.openLovOperacoes}
                atualizarOperacao={pedido.atualizarOperacao}
                codCondPgtoDigitado={pedido.codCondPgtoDigitado}
                buscarCondPgtoPorCodigo={pedido.buscarCondPgtoPorCodigo}
                CondPgto={pedido.CondPgto}
                possuiDadosFinanceiros={pedido.possuiDadosFinanceiros}
                statusCreditoCliente={pedido.statusCreditoCliente}
                prazoMedioVenda={pedido.prazoMedioVenda}
                creditoCliente={pedido.creditoCliente}
                limiteCreditoRuim={pedido.limiteCreditoRuim}
                possuiTitulosVencidos={pedido.possuiTitulosVencidos}
                setOpenLovCondPgto={pedido.setOpenLovCondPgto}
                openLovCondPgto={pedido.openLovCondPgto}
                setCondPgto={pedido.setCondPgto}
                clienteConsumidor={pedido.clienteConsumidor}
                menuModalidadeIntegracaoOpen={pedido.menuModalidadeIntegracaoOpen}
                setMenuModalidadeIntegracaoOpen={pedido.setMenuModalidadeIntegracaoOpen}
                setMenuOpcaoFreteOpen={pedido.setMenuOpcaoFreteOpen}
                modalidadeIntegracao={pedido.modalidadeIntegracao}
                setModalidadeIntegracao={pedido.setModalidadeIntegracao}
                menuOpcaoFreteOpen={pedido.menuOpcaoFreteOpen}
                setMenuCobrancaFreteOpen={pedido.setMenuCobrancaFreteOpen}
                opcaoFrete={pedido.opcaoFrete}
                setOpcaoFrete={pedido.setOpcaoFrete}
                menuCobrancaFreteOpen={pedido.menuCobrancaFreteOpen}
                cobrancaFrete={pedido.cobrancaFrete}
                setCobrancaFrete={pedido.setCobrancaFrete}
                numeroDecimalBR={pedido.numeroDecimalBR}
                setItensPedido={pedido.setItensPedido}
                cobrancaCalculada={pedido.cobrancaCalculada}
            />

            <ItensPedido
                loading={pedido.loading}
                loadingDadosCliente={pedido.loadingDadosCliente}
                setImportacaoAberta={pedido.setImportacaoAberta}
                recalcularItensManualmente={pedido.recalcularItensManualmente}
                itensPedido={pedido.itensPedido}
                importacaoAberta={pedido.importacaoAberta}
                importarItensExcel={pedido.importarItensExcel}
                itensAgrupadosOrdenados={pedido.itensAgrupadosOrdenados}
                itemPossuiAcordo={pedido.itemPossuiAcordo}
                itemPossuiPrecoListaBloqueado={pedido.itemPossuiPrecoListaBloqueado}
                itemPossuiUltimaCompra={pedido.itemPossuiUltimaCompra}
                itemSemTributacao={pedido.itemSemTributacao}
                lotesProximosMap={pedido.lotesProximosMap}
                getDestaqueClassificacao={pedido.getDestaqueClassificacao}
                getClasseLinhaItem={pedido.getClasseLinhaItem}
                removerItem={pedido.removerItem}
                setMenuSelecaoItensOpen={pedido.setMenuSelecaoItensOpen}
                menuSelecaoItensOpen={pedido.menuSelecaoItensOpen}
                selecionarItensPorUnidade={pedido.selecionarItensPorUnidade}
                calcularValoresItem={pedido.calcularValoresItem}
                handleCheckboxChange={pedido.handleCheckboxChange}
                handleQuantidadeChange={pedido.handleQuantidadeChange}
                validarMultiplo={pedido.validarMultiplo}
                navegarCamposItens={pedido.navegarCamposItens}
                valorListaEmEdicao={pedido.valorListaEmEdicao}
                setValorListaEmEdicao={pedido.setValorListaEmEdicao}
                handleValorListaChange={pedido.handleValorListaChange}
                validarValorListaPromocional={pedido.validarValorListaPromocional}
                handleSobraPercentualChange={pedido.handleSobraPercentualChange}
                aplicarSobraPercentual={pedido.aplicarSobraPercentual}
                cliente={pedido.cliente}
                setModalErro={pedido.setModalErro}
                operacao={pedido.operacao}
                CondPgto={pedido.CondPgto}
                setOpenLovItens={pedido.setOpenLovItens}
                cotar={pedido.cotar}
                openLovItens={pedido.openLovItens}
                ultimasComprasClienteMap={pedido.ultimasComprasClienteMap}
                notasCliente={pedido.notasCliente}
                adicionarItem={pedido.adicionarItem}
                ordenacaoItens={pedido.ordenacaoItens}
                alternarOrdenacaoItens={pedido.alternarOrdenacaoItens}
                totaisPorUnidade={pedido.totaisPorUnidade}
                freteSelecionado={pedido.freteSelecionado}
                opcaoFrete={pedido.opcaoFrete}
                cobrancaCalculada={pedido.cobrancaCalculada}
                cotacoesFrete={pedido.cotacoesFrete}
                selecionarTransportadora={pedido.selecionarTransportadora}
                formatarDataUltimaCompraItem={pedido.formatarDataUltimaCompraItem}
                getPedidosAcordoTexto={pedido.getPedidosAcordoTexto}
                getCodigoUnidadeCompra={pedido.getCodigoUnidadeCompra}
                formatarDataHistoricoCliente={pedido.formatarDataHistoricoCliente}
            />
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
            <ObservacoesPedido
                observacoes={pedido.observacoes}
                editarObs={pedido.editarObs}
                removerObs={pedido.removerObs}
                openObsModal={pedido.openObsModal}
                setOpenObsModal={pedido.setOpenObsModal}
                salvarObs={pedido.salvarObs}
                obsEditando={pedido.obsEditando}
                cliente={pedido.cliente}
                setModalErro={pedido.setModalErro}
                operacao={pedido.operacao}
                CondPgto={pedido.CondPgto}
                abrirNovaObs={pedido.abrirNovaObs}
            />
            <OrdemCompraPedido
                ordemCompra={pedido.ordemCompra}
                setOrdemCompra={pedido.setOrdemCompra}
                validarOrdemCompra={pedido.validarOrdemCompra}
            />
            <TriangulacaoPedido
                codClienteTriangulacaoDigitado={pedido.codClienteTriangulacaoDigitado}
                setCodClienteTriangulacaoDigitado={pedido.setCodClienteTriangulacaoDigitado}
                setClienteTriangulacao={pedido.setClienteTriangulacao}
                buscarClienteTriangulacaoPorCodigo={pedido.buscarClienteTriangulacaoPorCodigo}
                clienteTriangulacao={pedido.clienteTriangulacao}
                setOpenLovTriangulacao={pedido.setOpenLovTriangulacao}
                openLovTriangulacao={pedido.openLovTriangulacao}
                codOperacaoTriangulacaoDigitado={pedido.codOperacaoTriangulacaoDigitado}
                setCodOperacaoTriangulacaoDigitado={pedido.setCodOperacaoTriangulacaoDigitado}
                setOperacaoTriangulacao={pedido.setOperacaoTriangulacao}
                buscarOperacaoTriangulacaoPorCodigo={pedido.buscarOperacaoTriangulacaoPorCodigo}
                operacaoTriangulacao={pedido.operacaoTriangulacao}
                setModalErro={pedido.setModalErro}
                setOpenLovOperacoesTriangulacao={pedido.setOpenLovOperacoesTriangulacao}
                openLovOperacoesTriangulacao={pedido.openLovOperacoesTriangulacao}
            />
            <EnderecoEntregaPedido
                carregarTiposLogradouro={pedido.carregarTiposLogradouro}
                carregarEnderecoPadraoCliente={pedido.carregarEnderecoPadraoCliente}
                abrirLovEnderecos={pedido.abrirLovEnderecos}
                codCepDigitado={pedido.codCepDigitado}
                setCodCepDigitado={pedido.setCodCepDigitado}
                buscarCepPorCodigo={pedido.buscarCepPorCodigo}
                setOpenLovCep={pedido.setOpenLovCep}
                openLovCep={pedido.openLovCep}
                aplicarCep={pedido.aplicarCep}
                openLovEnderecos={pedido.openLovEnderecos}
                setOpenLovEnderecos={pedido.setOpenLovEnderecos}
                getCodigoPessoaCliente={pedido.getCodigoPessoaCliente}
                aplicarEnderecoEntrega={pedido.aplicarEnderecoEntrega}
                codUfDigitado={pedido.codUfDigitado}
                setCodUfDigitado={pedido.setCodUfDigitado}
                buscarUfPorCodigo={pedido.buscarUfPorCodigo}
                getDescricaoUf={pedido.getDescricaoUf}
                uf={pedido.uf}
                setOpenLovUf={pedido.setOpenLovUf}
                openLovUf={pedido.openLovUf}
                setUf={pedido.setUf}
                limparEnderecoCep={pedido.limparEnderecoCep}
                codCidadeDigitado={pedido.codCidadeDigitado}
                setCodCidadeDigitado={pedido.setCodCidadeDigitado}
                buscarCidadePorCodigo={pedido.buscarCidadePorCodigo}
                cidade={pedido.cidade}
                setOpenLovCidades={pedido.setOpenLovCidades}
                openLovCidades={pedido.openLovCidades}
                setCidade={pedido.setCidade}
                carregarUfPorCodigo={pedido.carregarUfPorCodigo}
                tipoLogradouroSelecionado={pedido.tipoLogradouroSelecionado}
                setTipoLogradouroSelecionado={pedido.setTipoLogradouroSelecionado}
                tiposLogradouro={pedido.tiposLogradouro}
                logradouroDigitado={pedido.logradouroDigitado}
                setLogradouroDigitado={pedido.setLogradouroDigitado}
                numeroEnderecoDigitado={pedido.numeroEnderecoDigitado}
                setNumeroEnderecoDigitado={pedido.setNumeroEnderecoDigitado}
                complementoEnderecoDigitado={pedido.complementoEnderecoDigitado}
                setComplementoEnderecoDigitado={pedido.setComplementoEnderecoDigitado}
                bairroDigitado={pedido.bairroDigitado}
                setBairroDigitado={pedido.setBairroDigitado}
                referenciaEnderecoDigitado={pedido.referenciaEnderecoDigitado}
                setReferenciaEnderecoDigitado={pedido.setReferenciaEnderecoDigitado}
                dataCargaDigitada={pedido.dataCargaDigitada}
                setDataCargaDigitada={pedido.setDataCargaDigitada}
                setModalErro={pedido.setModalErro}
            />
            <AcoesPedido
                abrirEmissaoProposta={pedido.abrirEmissaoProposta}
                abrirSelecaoUnidadesPedido={pedido.abrirSelecaoUnidadesPedido}
                loading={pedido.loading}
                loadingDadosCliente={pedido.loadingDadosCliente}
                salvarCotacao={pedido.salvarCotacao}
                novaCotacao={pedido.novaCotacao}
            />
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
