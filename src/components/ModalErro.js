import '../style/modalErro.css'
export function ModalErro({ aberto, mensagem, onClose }) {
        if (!aberto) return null;

        return (
            <div className="modal-backdrop" role="presentation">
                <div className="modal-erp" role="dialog" aria-modal="true" aria-labelledby="modal-mensagem-titulo">
                    <div className="modal-titulo" id="modal-mensagem-titulo">Mensagem do sistema</div>

                    <div className="modal-conteudo">
                        {mensagem}
                    </div>

                    <div className="modal-acoes">
                        <button type="button" autoFocus onClick={onClose}>OK</button>
                    </div>
                </div>
            </div>
        );
    }
