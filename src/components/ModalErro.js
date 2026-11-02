import '../style/modalErro.css'
export function ModalErro({ aberto, mensagem, detalhes, onClose }) {
        if (!aberto) return null;

        return (
            <div className="modal-backdrop" role="presentation">
                <div className="modal-erp modal-mensagem" role="dialog" aria-modal="true" aria-labelledby="modal-mensagem-titulo">
                    <div className="modal-titulo" id="modal-mensagem-titulo">Mensagem do sistema</div>

                    <div className="modal-conteudo">
                        {mensagem}
                        {detalhes && <details style={{ marginTop: 12 }}>
                            <summary style={{ cursor: 'pointer' }}>Mostrar detalhes</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '40vh', overflow: 'auto' }}>
                                {typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes, null, 2)}
                            </pre>
                        </details>}
                    </div>

                    <div className="modal-acoes">
                        <button type="button" autoFocus onClick={onClose}>OK</button>
                    </div>
                </div>
            </div>
        );
    }
