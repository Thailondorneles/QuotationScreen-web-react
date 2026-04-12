import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useEffect, useState } from 'react';
import { useLovPagination } from '../hooks/useLovPagination';
import { getCepsByFilter, getCeps } from '../services/ceps';

export function LovCep({ isOpen, setLovOpen, codCep, onSelect }) {
    const [filtro, setFiltro] = useState('');

    const lov = useLovPagination({
        limit: 25,
        fetchFn: ({ filtro, offset, limit }) => {
            if (filtro && filtro.trim() !== '') {
                return getCepsByFilter({ filtro, offset, limit });
            }
            return getCeps({ offset, limit });
        }
    });

    useEffect(() => {
        if (isOpen || codCep) {
            lov.buscar({ filtro: codCep, novoOffset: 0 });
        }
        // eslint-disable-next-line
    }, [isOpen, codCep]);

    if (!isOpen) return null;

    return (
        <div className="lov-overlay">
            <div className="lov-modal">

                <div className="lov-header">
                    <span>Seleção de CEPS</span>
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
                            {lov.data.map(cep => (
                                <tr
                                    key={cep.cod_cep}
                                    onClick={() => {
                                        onSelect(cep);
                                        setLovOpen(false);
                                    }}
                                    className="lov-row"
                                >
                                    <td>{cep.cod_cep}</td>
                                    <td>{cep.des_logradouro}</td>
                                    <td>{cep.des_bairro}</td>
                                    <td>{cep.des_cidade}</td>
                                    <td>{cep.cod_uf}</td>
                                    <td>{cep.num_cep}</td>
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
