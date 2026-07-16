import { useEffect, useState } from 'react';
import '../style/lovStyle.css';

const UNIDADES = [
    { codigo: 201, nome: 'Unidade 201 (Matriz)' },
    { codigo: 203, nome: 'Unidade 203 (Filial)' }
];

export function LovUnidadesPedido({ isOpen, onConfirm, onClose, unidadesDisponiveis = [] }) {
    const [selecionadas, setSelecionadas] = useState([]);

    useEffect(() => {
        if (isOpen) setSelecionadas([...unidadesDisponiveis]);
    }, [isOpen, unidadesDisponiveis]);

    if (!isOpen) return null;

    function alternarUnidade(codigo) {
        setSelecionadas(prev =>
            prev.includes(codigo)
                ? prev.filter(unidade => unidade !== codigo)
                : [...prev, codigo]
        );
    }

    function confirmar() {
        if (!selecionadas.length) return;
        onConfirm([...selecionadas].sort((a, b) => a - b));
    }

    return (
        <div className="lov-overlay">
            <div className="lov-modal lov-modal-unidades-pedido">
                <div className="lov-header">
                    <h3>Selecionar unidades do pedido</h3>
                    <button type="button" className="lov-close" onClick={onClose}>×</button>
                </div>

                <div className="lov-unidades-intro">
                    Confirme as unidades que serão integradas. Somente itens marcados serão enviados.
                </div>

                <div className="lov-list lov-list-unidades-pedido">
                    <table>
                        <thead>
                            <tr><th className="lov-check-col"></th><th>Unidade</th></tr>
                        </thead>
                        <tbody>
                            {UNIDADES.filter(unidade => unidadesDisponiveis.includes(unidade.codigo)).map(unidade => {
                                const selecionada = selecionadas.includes(unidade.codigo);
                                return (
                                    <tr
                                        key={unidade.codigo}
                                        className={selecionada ? 'lov-row-selected' : ''}
                                        onClick={() => alternarUnidade(unidade.codigo)}
                                    >
                                        <td className="lov-check-col">
                                            <input
                                                type="checkbox"
                                                checked={selecionada}
                                                onChange={() => alternarUnidade(unidade.codigo)}
                                                onClick={event => event.stopPropagation()}
                                            />
                                        </td>
                                        <td>{unidade.nome}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="lov-footer lov-unidades-actions">
                    <button type="button" className="lov-unidades-cancelar" onClick={onClose}>Cancelar</button>
                    <button type="button" className="lov-unidades-confirmar" onClick={confirmar} disabled={!selecionadas.length}>Confirmar</button>
                </div>
            </div>
        </div>
    );
}
