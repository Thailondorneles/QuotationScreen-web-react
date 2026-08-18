import '../style/modalErro.css';

export function ModalEmitirProposta({ aberto, carregando, onSelecionar, onCancelar }) {
    if (!aberto) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-erp modal-proposta" role="dialog" aria-modal="true" aria-labelledby="modal-proposta-titulo">
                <div className="modal-titulo" id="modal-proposta-titulo">Emitir proposta</div>
                <div className="modal-conteudo">
                    <p>Escolha o formato da proposta. Será gerado um arquivo separado para cada unidade com itens selecionados.</p>
                    <div className="modal-proposta-formatos">
                        <button type="button" disabled={carregando} onClick={() => onSelecionar('pdf')}>
                            <strong>PDF</strong>
                            <span>Documento pronto para apresentação</span>
                        </button>
                        <button type="button" disabled={carregando} onClick={() => onSelecionar('excel')}>
                            <strong>Excel</strong>
                            <span>Planilha editável com os itens e totais</span>
                        </button>
                    </div>
                    {carregando && <div className="modal-proposta-status">Gerando arquivos...</div>}
                </div>
                <div className="modal-acoes">
                    <button type="button" disabled={carregando} onClick={onCancelar}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}
