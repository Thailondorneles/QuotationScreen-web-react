import { FaTrash } from 'react-icons/fa';

export function AcoesPedido({
    abrirEmissaoProposta,
    abrirSelecaoUnidadesPedido,
    loading,
    loadingDadosCliente,
    salvarCotacao,
    excluirCotacao,
    pedidoSalvo,
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
                    {pedidoSalvo && <button type="button" className="btn-adicionar" disabled={loading || loadingDadosCliente}
                        onClick={excluirCotacao}><FaTrash aria-hidden="true" /> Excluir pedido</button>}
                    <button type="button" className="btn-adicionar" disabled={loading || loadingDadosCliente} onClick={salvarCotacao}>Salvar</button>
                    <button type="button" className="btn-adicionar" disabled={loading || loadingDadosCliente} onClick={novaCotacao}>Voltar</button>
                </div>
            </div>
    );
}
