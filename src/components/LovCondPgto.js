import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useEffect, useState } from 'react';
import { useLovPagination } from '../hooks/useLovPagination';
import { getCondPgtoByFilter, getCondPgto } from '../services/condPgto';

export function LovCondPgto({ isOpen, setLovOpen, codCond, onSelect }) {
    const [filtro, setFiltro] = useState('');

    const lov = useLovPagination({
        limit: 25,
        fetchFn: ({ filtro, offset, limit }) => {
            if (filtro && filtro.trim() !== '') {
                return getCondPgtoByFilter({ filtro, offset, limit });
            }
            return getCondPgto({ offset, limit });
        }
    });

    useEffect(() => {
        if (isOpen || codCond) {
            lov.buscar({ filtro: codCond, novoOffset: 0 });
        }
        // eslint-disable-next-line
    }, [isOpen, codCond]);

    if (!isOpen) return null;

    return (
        <div className="lov-overlay">
            <div className="lov-modal">

                <div className="lov-header">
                    <span>Seleção de Condições de Pagamento</span>
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
                            {lov.data.map(cond => (
                                <tr
                                    key={cond.cod_cond_pgto}
                                    onClick={() => {
                                        onSelect(cond);
                                        setLovOpen(false);
                                    }}
                                    className="lov-row"
                                >
                                    <td>{cond.cod_cond_pgto}</td>
                                    <td>{cond.des_cond_pgto}</td>
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
