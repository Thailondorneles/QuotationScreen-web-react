import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useEffect, useState } from 'react';
import { useLovPagination } from '../hooks/useLovPagination';
import { getUfByFilter, getUf } from '../services/uf';

export function LovUf({ isOpen, setLovOpen, codUf, onSelect }) {
    const [filtro, setFiltro] = useState('');

    const lov = useLovPagination({
        limit: 25,
        fetchFn: ({ filtro, offset, limit }) => {
            const filtroTexto = String(filtro ?? '');

            if (filtroTexto.trim() !== '') {
                return getUfByFilter({ filtro: filtroTexto, offset, limit });
            }
            return getUf({ offset, limit });
        }
    });

    useEffect(() => {
        if (isOpen || codUf) {
            lov.buscar({ filtro: codUf, novoOffset: 0 });
        }
    }, [isOpen, codUf]);

    if (!isOpen) return null;

    return (
        <div className="lov-overlay">
            <div className="lov-modal">
                <div className="lov-header">
                    <span>Selecao de UF</span>
                    <FaX className="lov-close" onClick={() => setLovOpen(false)} />
                </div>

                <div className="lov-search">
                    <label>Localizar:</label>
                    <input
                        value={filtro}
                        onChange={e => setFiltro(e.target.value)}
                        onKeyDown={e =>
                            e.key === 'Enter' &&
                            lov.buscar({ filtro, novoOffset: 0 })
                        }
                    />
                    <button onClick={() => lov.buscar({ filtro, novoOffset: 0 })}>
                        BUSCAR
                    </button>
                </div>

                <div className="lov-list">
                    <table>
                        <tbody>
                            {lov.data.map(uf => (
                                <tr
                                    key={uf.cod_uf}
                                    onClick={() => {
                                        onSelect(uf);
                                        setLovOpen(false);
                                    }}
                                    className="lov-row"
                                >
                                    <td>{uf.cod_uf}</td>
                                    <td>{uf.des_uf}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="lov-footer">
                    <button disabled={!lov.podeVoltar} onClick={() => lov.buscar({ filtro, novoOffset: lov.offset - 25 })}>
                        <FaChevronLeft />
                    </button>

                    <span>
                        {lov.offset + 1}-{lov.offset + lov.data.length}
                    </span>

                    <button disabled={!lov.podeAvancar} onClick={() => lov.buscar({ filtro, novoOffset: lov.offset + 25 })}>
                        <FaChevronRight />
                    </button>
                </div>
            </div>
        </div>
    );
}
