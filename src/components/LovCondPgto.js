import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useEffect, useState } from 'react';
import { useLovPagination } from '../hooks/useLovPagination';
import { getAllCondPgtoCached, filtrarCondicoesPagamento } from '../services/condPgto';

export function LovCondPgto({ isOpen, setLovOpen, codCond, onSelect }) {
    const [filtro, setFiltro] = useState('');
    const [filtroAplicado, setFiltroAplicado] = useState('');
    const [erro, setErro] = useState('');

    const lov = useLovPagination({
        limit: 25,
        fetchFn: async ({ filtro, offset, limit }) => {
            const condicoes = filtrarCondicoesPagamento(await getAllCondPgtoCached(), filtro);
            return { data: {
                items: condicoes.slice(offset, offset + limit),
                count: condicoes.length,
                hasMore: offset + limit < condicoes.length
            } };
        }
    });

    async function buscar(valorFiltro, novoOffset = 0) {
        setErro('');
        try {
            await lov.buscar({ filtro: valorFiltro, novoOffset });
            setFiltroAplicado(valorFiltro);
        } catch {
            setErro('Não foi possível carregar as condições de pagamento. Tente novamente.');
        }
    }

    useEffect(() => {
        if (isOpen) {
            const valorFiltro = String(codCond ?? '');
            setFiltro(valorFiltro);
            buscar(valorFiltro);
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
                        placeholder="Código ou descrição"
                        onChange={e => setFiltro(e.target.value)}
                        onKeyDown={e =>
                            e.key === 'Enter' &&
                            buscar(filtro)
                        }
                    />
                    <button disabled={lov.loading} onClick={() => buscar(filtro)}>
                        BUSCAR
                    </button>
                </div>

                <div className="lov-list">
                    {erro && <div role="alert">{erro}</div>}
                    {lov.loading && <div className="lov-loading"><span className="lov-spinner"></span></div>}
                    {!lov.loading && !erro && lov.data.length === 0 && <p>Nenhuma condição de pagamento encontrada.</p>}
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
                    <button disabled={lov.loading || !lov.podeVoltar} onClick={() => buscar(filtroAplicado, lov.offset - 25)}>
                        <FaChevronLeft />
                    </button>

                    <span>
                        {lov.data.length ? lov.offset + 1 : 0}-{lov.offset + lov.data.length} de {lov.total}
                    </span>

                    <button disabled={lov.loading || !lov.podeAvancar} onClick={() => buscar(filtroAplicado, lov.offset + 25)}>
                        <FaChevronRight />
                    </button>
                </div>
            </div>
        </div>
    );
}
