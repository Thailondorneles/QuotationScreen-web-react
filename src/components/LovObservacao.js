import { useState, useEffect } from "react";
import '../style/lovObsStyle.css'

export function LovObservacao({ isOpen, onClose, onSave, obs }) {

    const [descricao, setDescricao] = useState('');
    const [flags, setFlags] = useState({
        pedido: false,
        nota: false,
        registro: false,
        financeiro: false
    });

    useEffect(() => {
        if (obs) {
            setDescricao(obs.descricao);
            setFlags({
                pedido: obs.pedido,
                nota: obs.nota,
                registro: obs.registro,
                financeiro: obs.financeiro
            });
        } else {
            setDescricao('');
            setFlags({
                pedido: false,
                nota: false,
                registro: false,
                financeiro: false
            });
        }
    }, [obs]);

    if (!isOpen) return null;

    return (
        <div className="lov-overlay">
            <div className="lov-modal">
                <div className="lov-header">    
                    <span>Observação</span>
                </div>
                <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    maxLength={4000}
                />

                <div className="flags">
                    <label><input type="checkbox" checked={flags.pedido} onChange={() => setFlags(f => ({ ...f, pedido: !f.pedido }))}/> Pedido</label>
                    <label><input type="checkbox" checked={flags.nota} onChange={() => setFlags(f => ({ ...f, nota: !f.nota }))}/> Nota fiscal</label>
                    <label><input type="checkbox" checked={flags.registro} onChange={() => setFlags(f => ({ ...f, registro: !f.registro }))}/> Registro de saídas</label>
                    <label><input type="checkbox" checked={flags.financeiro} onChange={() => setFlags(f => ({ ...f, financeiro: !f.financeiro }))}/> Contas a receber</label>
                </div>

                <div className="acoes">
                    <button onClick={() => onSave({num_seq: obs?.num_seq,descricao,...flags})}>✔ Aplicar</button>
                    <button onClick={onClose}>✖ Fechar</button>
                </div>

            </div>
        </div>
    );
}