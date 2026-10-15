import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaInfoCircle } from 'react-icons/fa';
import { getLotesDisponiveis } from '../services/itens';
import '../style/lotesDisponiveis.css';

export default function LotesDisponiveisItem({ codItem, descricao }) {
    const [aberto, setAberto] = useState(false);
    const [lotes, setLotes] = useState([]);
    const [status, setStatus] = useState('carregando');
    const [tentativa, setTentativa] = useState(0);
    const botaoRef = useRef(null);
    const fecharRef = useRef(null);
    function fechar() { setAberto(false); botaoRef.current?.focus(); }
    useEffect(() => {
        if (!aberto) return;
        let ativo = true;
        setStatus('carregando');
        fecharRef.current?.focus();
        getLotesDisponiveis(codItem).then(items => {
            if (ativo) { setLotes(items); setStatus('pronto'); }
        }).catch(() => { if (ativo) setStatus('erro'); });
        return () => { ativo = false; };
    }, [aberto, codItem, tentativa]);
    return <>
        <button type="button" ref={botaoRef} className="lotes-info" title="Consultar lotes disponíveis"
            aria-label={`Lotes disponíveis do item ${codItem}`} aria-haspopup="dialog" aria-expanded={aberto}
            onClick={event => { event.stopPropagation(); setAberto(true); }}><FaInfoCircle /></button>
        {aberto && createPortal(<div className="lotes-overlay" onClick={event => {
            event.stopPropagation();
            if (event.target === event.currentTarget) fechar();
        }} onKeyDown={event => {
            event.stopPropagation();
            if (event.key === 'Escape') { event.preventDefault(); fechar(); }
            if (event.key === 'Tab') {
                const botoes = event.currentTarget.querySelectorAll('button');
                const primeiro = botoes[0];
                const ultimo = botoes[botoes.length - 1];
                if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
                else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
            }
        }}>
            <section className="lotes-dialog" role="dialog" aria-modal="true" aria-label={`Lotes disponíveis do item ${codItem}`}>
                <div className="lotes-titulo"><h3>Lotes disponíveis — {codItem}</h3>
                    <button type="button" ref={fecharRef} onClick={fechar} aria-label="Fechar lotes disponíveis">✕</button></div>
                <p>{descricao}</p>
                {status === 'carregando' && <p role="status">Carregando lotes...</p>}
                {status === 'erro' && <div role="alert"><p>Não foi possível consultar os lotes.</p>
                    <button type="button" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></div>}
                {status === 'pronto' && (lotes.length ? <div className="lotes-tabela"><table>
                    <thead><tr><th>Lote</th><th>Validade</th><th>Quantidade disponível</th></tr></thead>
                    <tbody>{lotes.map((lote, indice) => <tr key={`${lote.num_lote}-${indice}`}>
                        <td>{lote.num_lote || '—'}</td>
                        <td>{lote.dta_validade ? String(lote.dta_validade).slice(0, 10).split('-').reverse().join('/') : '—'}</td>
                        <td>{lote.qtd_disponivel == null ? '—' : Number(lote.qtd_disponivel).toLocaleString('pt-BR')}</td>
                    </tr>)}</tbody>
                </table></div> : <p>Nenhum lote disponível para este item.</p>)}
            </section>
        </div>, document.body)}
    </>;
}
