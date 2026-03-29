import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useEffect, useState } from 'react';
import { useLovPagination } from '../hooks/useLovPagination';
import { getItens, getItemByFilter } from '../services/itens';

export function LovItens({ isOpen, setLovOpen, onSelect }) {
    const [filtro, setFiltro] = useState('');

    const lov = useLovPagination({
        limit: 25,
        fetchFn: ({ filtro, offset, limit }) => {
            if (filtro && filtro.trim() !== '') {
                return getItemByFilter({ filtro, offset, limit});
            }
            return getItens({ offset, limit });
        }
    });

    const itensAgrupados = Object.values(
        lov.data.reduce((acc, item) => {
            if (!acc[item.cod_item]) {
                acc[item.cod_item] = {
                    cod_item: item.cod_item,
                    des_item: item.des_item,
                    qtd_multiplo: item.qtd_multiplo,
                    qtd_altura: item.qtd_altura,
                    qtd_largura: item.qtd_largura,
                    qtd_comprimento: item.qtd_comprimento,
                    qtd_m3: item.qtd_m3,
                    qtd_m2: item.qtd_m2,
                    qtd_peso_bruto: item.qtd_peso_bruto,
                    estoque_matriz: 0,
                    estoque_filial: 0
                };
            }

            if (item.cod_unidade === 201) {
                acc[item.cod_item].estoque_matriz = item.qtd_disponivel;
            }

            if (item.cod_unidade === 203) {
                acc[item.cod_item].estoque_filial = item.qtd_disponivel;
            }

            return acc;
        }, {})
    );

    useEffect(() => {
        if (isOpen) {
            lov.buscar({ filtro: '', novoOffset: 0 });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="lov-overlay">
            <div className="lov-modal">
                <div className="lov-header">
                    <span>Seleção de itens</span>
                    <FaX className="lov-close" onClick={() => setLovOpen(false)} />
                </div>
                <div className="lov-search">
                    <label>Localizar:</label>
                    <input
                        value={filtro}
                        onChange={e => setFiltro(e.target.value)}
                        onKeyDown={e =>{
                            if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                lov.buscar({ filtro, novoOffset: 0 });
                            }
                        }}
                    />
                    <button onClick={() => lov.buscar({ filtro, novoOffset: 0 })}>
                        BUSCAR
                    </button>
                </div>
                <div className="lov-list">
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Descrição</th>
                                <th>Estoque Matriz</th>
                                <th>Estoque Filial</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensAgrupados.map(item => (
                                <tr key={item.cod_item} onClick={() => {
                                    onSelect(item);
                                    console.log(item);
                                    setLovOpen(false);
                                    setFiltro('');
                                }}>         
                                    <td>{item.cod_item}</td>
                                    <td>{item.des_item}</td>
                                    <td>{item.estoque_matriz}</td>
                                    <td>{item.estoque_filial}</td>
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