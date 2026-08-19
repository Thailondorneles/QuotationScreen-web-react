import '../style/modalErro.css';

export function ModalConfirmacao({ aberto, mensagem, onConfirmar, onCancelar }) {
    if (!aberto) return null;

    return (
        <div className="modal-backdrop modal-confirmacao-backdrop">
            <div className="modal-erp modal-confirmacao-erp">
                <div className="modal-titulo modal-confirmacao-titulo">Confirmação de envio</div>

                <div className="modal-conteudo">
                    {mensagem}
                </div>

                <div className="modal-acoes modal-acoes-confirmacao">
                    <button type="button" className="modal-btn modal-btn-nao" onClick={onCancelar}>Não</button>
                    <button type="button" className="modal-btn modal-btn-sim" onClick={onConfirmar}>Sim, enviar</button>
                </div>
            </div>
        </div>
    );
}
