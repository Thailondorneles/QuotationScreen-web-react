import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useEffect, useState } from 'react';
import { useLovPagination } from '../hooks/useLovPagination';
import { getCidadesByFilter, getCidades } from '../services/cidades';

export function LovCidades({ isOpen, setLovOpen, codIbge, onSelect }) {
    const [filtro, setFiltro] = useState('');

    const lov = useLovPagination({
        limit: 25,
        fetchFn: ({ filtro, offset, limit }) => {
            const filtroTexto = String(filtro ?? '');

            if (filtroTexto.trim() !== '') {
                return getCidadesByFilter({ filtro: filtroTexto, offset, limit});
            }
            return getCidades({ offset, limit });
        }
    });

    useEffect(() => {
        if (isOpen || codIbge) {
            lov.buscar({ filtro: codIbge, novoOffset: 0 });
        }
    }, [isOpen, codIbge]);

    if (!isOpen) return null;

    return (
        <div className="lov-overlay">
            <div className="lov-modal">

                <div className="lov-header">
                    <span>Seleção de Cidades</span>
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
                            {lov.data.map(rep => (
                                <tr
                                    key={rep.cod_ibge}
                                    onClick={() => {
                                        onSelect(rep);
                                        setLovOpen(false);
                                    }}
                                    className="lov-row"
                                >
                                    <td>{rep.cod_ibge}</td>
                                    <td>{rep.des_cidade}</td>
                                    <td>{rep.cod_uf} </td>
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
