import { useState, useEffect } from 'react';
import '../style/lovStyle.css';

export function LovTransportadoras({
    isOpen,
    cotacoes = [],
    selecionados = {},
    onConfirm,
    onClose
}) {
    const [sel, setSel] = useState({ 201: null, 203: null });

    useEffect(() => {
        setSel(selecionados || { 201: null, 203: null });
    }, [selecionados, isOpen]);

    if (!isOpen) return null;

    function selecionar(unidade, transportadora) {
        setSel(prev => ({
            ...prev,
            [unidade]: transportadora
        }));
    }

    function confirmar() {
        const unidadesPresentes = cotacoes.map(c => c.unidade);

        for (const u of unidadesPresentes) {
            if (!sel[u]) {
                alert(`Selecione a transportadora da unidade ${u}`);
                return;
            }
        }

        onConfirm(sel);
    }

    return (
        <div className="lov-overlay">
            <div className="lov-modal">

                <div className="lov-header">
                    <h3>Seleção de Transportadoras</h3>
                    <button className="lov-close" onClick={onClose}>×</button>
                </div>

                <div className="lov-list">
                    {cotacoes.map((cot) => (
                        <div key={cot.unidade} className="bloco-unidade">

                            <h4>Unidade {cot.unidade}</h4>

                            <table className="tabela-transportadoras">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Transportadora</th>
                                        <th>Prazo</th>
                                        <th>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cot.transportadoras.map((t, idx) => (
                                        <tr
                                            key={idx}
                                            className={sel[cot.unidade]?.nome === t.nome ? 'linha-selecionada' : ''}
                                            onClick={() => selecionar(cot.unidade, t)}
                                        >
                                            <td>
                                                <input
                                                    type="radio"
                                                    name={`unidade-${cot.unidade}`}
                                                    checked={sel[cot.unidade]?.nome === t.nome}
                                                    onChange={() => selecionar(cot.unidade, t)}
                                                />
                                            </td>
                                            <td>{t.nome}</td>
                                            <td>{t.prazo} dias</td>
                                            <td>R$ {Number(t.valor).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <div className="lov-footer">
                    <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
                    <button className="btn-confirmar" onClick={confirmar}>Confirmar</button>
                </div>

            </div>
        </div>
    );
}
