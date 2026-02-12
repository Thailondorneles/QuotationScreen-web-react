import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useEffect, useState } from 'react';
import { useLovPagination } from '../hooks/useLovPagination';
import { getClientes, getClienteByFilter } from '../services/clientes';

export function LovClientes({ isOpen, setLovOpen, onSelect }) {
    const [filtro, setFiltro] = useState('');

    const lov = useLovPagination({
        limit: 25,
        fetchFn: ({ filtro, offset, limit }) => {
            if (filtro && filtro.trim() !== '') {
                return getClienteByFilter({ filtro, offset, limit });
            }
            return getClientes({ offset, limit });
        }
    });

    useEffect(() => {
        if (isOpen) {
            lov.buscar({ filtro: '', novoOffset: 0 });
        }
        // eslint-disable-next-line
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="lov-overlay">
            <div className="lov-modal">

                <div className="lov-header">
                    <span>Seleção de Clientes</span>
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
                            {lov.data.map(clientes => (
                                <tr key={clientes.cod_pessoa} onClick={() => { onSelect(clientes); setLovOpen(false); }}>
                                    <td>{clientes.cod_pessoa}</td>
                                    <td>{clientes.des_pessoa}</td>
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
