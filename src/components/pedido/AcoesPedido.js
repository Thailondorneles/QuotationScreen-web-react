export function AcoesPedido({
    abrirEmissaoProposta,
    abrirSelecaoUnidadesPedido,
    loading,
    loadingDadosCliente,
    salvarCotacao,
    novaCotacao
}) {
    return (
        <div className="integracao-card">
                <div className="obs-footer">
                    <button type="button" className="btn-adicionar" onClick={abrirEmissaoProposta}>
                        Emitir proposta
                    </button>
                    <button type="button" className="btn-adicionar" onClick={abrirSelecaoUnidadesPedido}>
                        Enviar pedido ao ERP
                    </button>
                    <button type="button" className="btn-adicionar" disabled={loading || loadingDadosCliente} onClick={salvarCotacao}>Salvar</button>
                    <button type="button" className="btn-adicionar" disabled={loading || loadingDadosCliente} onClick={novaCotacao}>Voltar</button>
                </div>
            </div>
    );
}
