import '../style/modalErro.css'
export function ModalErro({ aberto, mensagem, onClose }) {
        if (!aberto) return null;

        return (
            <div className="modal-backdrop">
                <div className="modal-erp">
                    <div className="modal-titulo">Mensagem do sistema</div>

                    <div className="modal-conteudo">
                        {mensagem}
                    </div>

                    <div className="modal-acoes">
                        <button onClick={onClose}>OK</button>
                    </div>
                </div>
            </div>
        );
    }