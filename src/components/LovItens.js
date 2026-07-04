import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { FaStar } from "react-icons/fa";
import { useEffect, useMemo, useState } from 'react';
import { useLovPagination } from '../hooks/useLovPagination';
import { getItens, getItemByFilter } from '../services/itens';

export function LovItens({ isOpen, setLovOpen, onSelect, itensExistentes = [] }) {
    const [filtro, setFiltro] = useState('POLIMAX');
    const [itensSelecionados, setItensSelecionados] = useState({});
    const [menuSelecionarOpen, setMenuSelecionarOpen] = useState(false);
    const [ordenacao, setOrdenacao] = useState({ coluna: null, direcao: null });

    const itensExistentesCodigos = useMemo(
        () => new Set(itensExistentes.map(item => item.cod_item)),
        [itensExistentes]
    );

    const lov = useLovPagination({
        limit: 25,
        cacheKey: 'itens',
        fetchFn: ({ filtro, offset, limit }) => {
            const filtroBusca = normalizarFiltroItem(filtro);

            if (filtroBusca) {
                return getItemByFilter({ filtro: filtroBusca, offset, limit});
            }
            return getItens({ offset, limit });
        }
    });

    useEffect(() => {
        lov.buscar({ filtro: 'POLIMAX', novoOffset: 0 }).catch(() => {});
    }, []);

    function normalizarFiltroItem(valor) {
        return String(valor ?? '')
            .trim();
    }

    const itensAgrupados = Object.values(
        lov.data.reduce((acc, item) => {
            if (!acc[item.cod_item]) {
                acc[item.cod_item] = {
                    cod_item: item.cod_item,
                    cod_completo: item.cod_completo,
                    des_item: item.des_item,
                    principios_ativos: item.principios_ativos,
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

            if (!acc[item.cod_item].cod_completo && item.cod_completo) {
                acc[item.cod_item].cod_completo = item.cod_completo;
            }

            if (!acc[item.cod_item].principios_ativos && item.principios_ativos) {
                acc[item.cod_item].principios_ativos = item.principios_ativos;
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

    const itensOrdenados = useMemo(() => {
        if (!ordenacao.coluna || !ordenacao.direcao) {
            return itensAgrupados;
        }

        return [...itensAgrupados].sort((a, b) => {
            const valorA = a[ordenacao.coluna];
            const valorB = b[ordenacao.coluna];
            const numeroA = Number(valorA);
            const numeroB = Number(valorB);
            const ambosNumericos = valorA !== null && valorA !== undefined
                && valorB !== null && valorB !== undefined
                && !Number.isNaN(numeroA)
                && !Number.isNaN(numeroB);
            const resultado = ambosNumericos
                ? numeroA - numeroB
                : String(valorA ?? '').localeCompare(String(valorB ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' });

            return ordenacao.direcao === 'asc' ? resultado : -resultado;
        });
    }, [itensAgrupados, ordenacao]);

    useEffect(() => {
        if (isOpen) {
            setItensSelecionados({});
            setMenuSelecionarOpen(false);
            if (lov.precisaAtualizar) {
                lov.buscar({ filtro, novoOffset: lov.offset }).catch(() => {});
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    function itemEstaSelecionado(codItem) {
        return Boolean(itensSelecionados[codItem]);
    }

    function itemJaExiste(codItem) {
        return itensExistentesCodigos.has(codItem);
    }

    function alternarItem(codItem, item) {
        if (itemJaExiste(codItem)) return;

        setItensSelecionados(prev => {
            if (prev[codItem]) {
                const next = { ...prev };
                delete next[codItem];
                return next;
            }

            return {
                ...prev,
                [codItem]: item
            };
        });
    }

    function marcarTodos() {
        setItensSelecionados(prev => {
            const next = { ...prev };
            itensOrdenados.forEach(item => {
                if (!itemJaExiste(item.cod_item)) {
                    next[item.cod_item] = item;
                }
            });
            return next;
        });
        setMenuSelecionarOpen(false);
    }

    function desmarcarTodos() {
        setItensSelecionados({});
        setMenuSelecionarOpen(false);
    }

    function adicionarSelecionados() {
        const selecionados = Object.values(itensSelecionados).filter(
            item => !itemJaExiste(item.cod_item)
        );

        if (!selecionados.length) return;

        onSelect(selecionados);
        setLovOpen(false);
        setItensSelecionados({});
        setMenuSelecionarOpen(false);
    }

    function alternarOrdenacao(coluna) {
        setOrdenacao(prev => {
            if (prev.coluna !== coluna) {
                return { coluna, direcao: 'desc' };
            }

            if (prev.direcao === 'desc') {
                return { coluna, direcao: 'asc' };
            }

            return { coluna: null, direcao: null };
        });
    }

    function indicadorOrdenacao(coluna) {
        if (ordenacao.coluna !== coluna) return '';
        return ordenacao.direcao === 'desc' ? '↓' : '↑';
    }

    function cabecalhoOrdenavel(coluna, texto) {
        return (
            <button
                type="button"
                className="lov-sort-button"
                onClick={() => alternarOrdenacao(coluna)}
            >
                <span>{texto}</span>
                <span className="lov-sort-indicator">{indicadorOrdenacao(coluna)}</span>
            </button>
        );
    }

    function itemEhMarcaPropria(item) {
        return String(item.cod_completo ?? '').trim().toUpperCase() === 'POLIMAX';
    }

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
                    <button
                        onClick={() => lov.buscar({ filtro, novoOffset: 0 })}
                        disabled={lov.loading}
                    >
                        {lov.loading && <span className="lov-spinner lov-spinner-button"></span>}
                        BUSCAR
                    </button>
                </div>
                <div className="lov-actions">
                    <div className="lov-select-menu">
                        <button
                            type="button"
                            className="lov-select-trigger"
                            onClick={() => setMenuSelecionarOpen(prev => !prev)}
                        >
                            Selecionar
                        </button>
                        {menuSelecionarOpen && (
                            <div className="lov-select-dropdown">
                                <button type="button" onClick={marcarTodos}>Marcar todos</button>
                                <button type="button" onClick={desmarcarTodos}>Desmarcar todos</button>
                            </div>
                        )}
                    </div>
                    <span className="lov-selected-count">
                        {Object.keys(itensSelecionados).length} selecionado(s)
                    </span>
                    <button
                        type="button"
                        className="lov-primary-button"
                        disabled={!Object.keys(itensSelecionados).length}
                        onClick={adicionarSelecionados}
                    >
                        Adicionar selecionados
                    </button>
                </div>
                <div className="lov-list">
                    {lov.loading && (
                        <div className="lov-loading">
                            <span className="lov-spinner"></span>
                        </div>
                    )}
                    <table>
                        <thead>
                            <tr>
                                <th className="lov-check-col"></th>
                                <th>{cabecalhoOrdenavel('cod_item', 'Código')}</th>
                                <th>{cabecalhoOrdenavel('des_item', 'Descrição')}</th>
                                <th>{cabecalhoOrdenavel('principios_ativos', 'Princípio ativo')}</th>
                                <th>{cabecalhoOrdenavel('cod_completo', 'Marca')}</th>
                                <th>{cabecalhoOrdenavel('estoque_matriz', 'Estoque Matriz')}</th>
                                <th>{cabecalhoOrdenavel('estoque_filial', 'Estoque Filial')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensOrdenados.map(item => {
                                const existe = itemJaExiste(item.cod_item);
                                const selecionado = itemEstaSelecionado(item.cod_item);
                                const marcaPropria = itemEhMarcaPropria(item);

                                return (
                                    <tr
                                        key={item.cod_item}
                                        className={[
                                            existe ? 'lov-row-disabled' : selecionado ? 'lov-row-selected' : '',
                                            marcaPropria ? 'lov-row-marca-propria' : ''
                                        ].filter(Boolean).join(' ')}
                                        onClick={() => !existe && alternarItem(item.cod_item, item)}
                                    >
                                        <td className="lov-check-col">
                                            <input
                                                type="checkbox"
                                                checked={selecionado}
                                                disabled={existe}
                                                onChange={() => !existe && alternarItem(item.cod_item, item)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </td>
                                    <td>{item.cod_item}</td>
                                    <td>{item.des_item}</td>
                                    <td>{item.principios_ativos || '-'}</td>
                                    <td>
                                        {marcaPropria && (
                                            <FaStar
                                                className="lov-brand-star"
                                                title="Marca própria"
                                                aria-label="Marca própria"
                                            />
                                        )}
                                        {item.cod_completo || '-'}
                                    </td>
                                    <td>{item.estoque_matriz}</td>
                                    <td>{item.estoque_filial}</td>
                                </tr>
                            )})}
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
