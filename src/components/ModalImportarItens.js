import { useState } from 'react';
import { baixarModeloItens, lerPlanilhaItens } from '../services/importacaoItens';
import '../style/modalErro.css';
import '../style/importarItens.css';

export function ModalImportarItens({ onClose, onImportar }) {
    const [arquivo, setArquivo] = useState(null);
    const [ocupado, setOcupado] = useState(false);
    const [erro, setErro] = useState('');
    async function executar(action) {
        setOcupado(true);
        setErro('');
        try { await action(); }
        catch (error) { setErro(error.message || 'Não foi possível importar o arquivo.'); }
        finally { setOcupado(false); }
    }
    return <div className="importar-itens-overlay">
        <section role="dialog" aria-modal="true" aria-labelledby="importar-itens-titulo" className="importar-itens-modal">
            <h2 id="importar-itens-titulo">Importar itens do Excel</h2>
            <p>Preencha uma linha por produto com o código do item e a quantidade.</p>
            <p>Cada item será acrescentado nas unidades 201 e 203 com a mesma quantidade e os preços retornados pelas APIs de cada unidade. Substitua o exemplo do modelo antes de importar.</p>
            <button type="button" className="modal-btn modal-btn-sim" disabled={ocupado} onClick={() => executar(baixarModeloItens)}>Baixar modelo Excel</button>
            <label className="importar-itens-arquivo">Arquivo Excel (.xlsx)
                <input autoFocus type="file" accept=".xlsx" disabled={ocupado} onChange={e => { setArquivo(e.target.files[0]); setErro(''); }} />
            </label>
            <p>Até 200 linhas e 5 MB. A importação respeita múltiplos, tributação e regras de preço.</p>
            {erro && <p role="alert" className="importar-itens-erro">{erro}</p>}
            <div className="importar-itens-acoes">
                <button type="button" className="modal-btn modal-btn-nao" disabled={ocupado} onClick={onClose}>Cancelar</button>
                <button type="button" className="modal-btn modal-btn-sim" disabled={ocupado || !arquivo} onClick={() => executar(async () => {
                    await onImportar(await lerPlanilhaItens(arquivo));
                    onClose();
                })}>{ocupado ? 'Processando...' : 'Importar itens'}</button>
            </div>
        </section>
    </div>;
}
