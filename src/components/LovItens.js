import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { FaStar } from "react-icons/fa";
import { useEffect, useMemo, useRef, useState } from 'react';
import { getImpostos } from '../services/impostos.js';
import { getItens, getItensAcordos } from '../services/itens';
import { getClientesUltimasCompras, agruparUltimasComprasPorItem } from '../services/clientes.js';

const ITENS_POR_PAGINA = 25;
const CACHE_TTL = 5 * 60 * 1000;
const FILTRO_PADRAO = 'POLIMAX';
let cacheItens = null;
let requisicaoItens = null;
let acordosCache = new Map();
let ultimasComprasClienteCache = new Map(); // Cache por cliente
let requisicaoUltimasComprasCliente = new Map(); // Requisições em andamento por cliente

function normalizarTextoBusca(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

function normalizarFiltroItem(valor) {
    return String(valor ?? '').trim();
}

function correspondeAoLike(valor, filtro) {
    const texto = normalizarTextoBusca(valor);
    const termos = normalizarTextoBusca(filtro)
        .split(/[\s%]+/)
        .filter(Boolean);

    return termos.every(termo => texto.includes(termo));
}

function formatarMoeda(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '-';

    return numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarData(valor) {
    if (!valor) return '-';

    const data = new Date(valor);
    return Number.isNaN(data.getTime())
        ? '-'
        : data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function LovItens({ isOpen, setLovOpen, onSelect, itensExistentes = [], codCliente = null, codOper = null, codCondPgto = null }) {
    const [filtro, setFiltro] = useState(FILTRO_PADRAO);
    const [itensSelecionados, setItensSelecionados] = useState({});
    const [menuSelecionarOpen, setMenuSelecionarOpen] = useState(false);
    const [ordenacao, setOrdenacao] = useState({ coluna: null, direcao: null });
    const [todosItens, setTodosItens] = useState([]);
    const [filtroAplicado, setFiltroAplicado] = useState(FILTRO_PADRAO);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [acordosMap, setAcordosMap] = useState({});
    const [precosImpostosMap, setPrecosImpostosMap] = useState({});
    const [ultimasComprasMap, setUltimasComprasMap] = useState({});
    const [loadingValores, setLoadingValores] = useState(false);
    const [atualizadoEm, setAtualizadoEm] = useState(0);
    const ultimaRequisicao = useRef(0);
    const precosImpostosCache = useRef(new Map());

    const itensExistentesCodigos = useMemo(
        () => new Set(itensExistentes.map(item => item.cod_item)),
        [itensExistentes]
    );

    async function carregarTodosItens() {
        if (cacheItens && cacheItens.expiraEm > Date.now()) {
            return cacheItens.itens;
        }

        if (requisicaoItens) {
            return requisicaoItens;
        }

        requisicaoItens = getItens()
            .then(response => {
                const resposta = response.data || {};
                const itens = Array.isArray(resposta) ? resposta : (resposta.items || []);

                cacheItens = {
                    itens,
                    expiraEm: Date.now() + CACHE_TTL
                };

                (async () => {
                    try {
                        if (codCliente && codOper && codCondPgto && Array.isArray(itens) && itens.length) {
                            prefetchPrecosParaItens(itens).catch(() => {});
                        }
                    } catch (e) {}
                })();

                return itens;
            })
            .finally(() => {
                requisicaoItens = null;
            });

        return requisicaoItens;
    }

    async function obterPrecoImpostosGlobal(codItem, unidade) {
        const chave = `${codCliente}-${codOper}-${codCondPgto}-${codItem}-${unidade}`;
        if (precosImpostosCache.current.has(chave)) {
            const cached = precosImpostosCache.current.get(chave);
            return typeof cached === 'function' ? await cached() : await cached;
        }

        const requisicao = getImpostos({
            codOper,
            codUnidade: unidade,
            codPessoa: codCliente,
            codCondPgto,
            codItem
        })
            .then(response => response.data?.vlr_item ?? null)
            .catch(() => null);

        precosImpostosCache.current.set(chave, requisicao);
        const preco = await requisicao;
        precosImpostosCache.current.set(chave, preco);
        return preco;
    }

    async function prefetchPrecosParaItens(itens) {
        if (!Array.isArray(itens) || itens.length === 0) return;
        const CHUNK = 20;
        for (let i = 0; i < itens.length; i += CHUNK) {
            const slice = itens.slice(i, i + CHUNK);
            const resultados = await Promise.all(slice.map(item => Promise.all([
                obterPrecoImpostosGlobal(item.cod_item, 201),
                obterPrecoImpostosGlobal(item.cod_item, 203)
            ])));

            // update map incrementally
            const atualiz = Object.fromEntries(slice.map((item, idx) => [item.cod_item, {
                lista201: resultados[idx][0],
                lista203: resultados[idx][1]
            }]));

            setPrecosImpostosMap(prev => ({ ...prev, ...atualiz }));
            // small delay to avoid overwhelming backend
            await new Promise(r => setTimeout(r, 50));
        }
    }

    async function buscar({ filtro: valorFiltro, novoOffset = 0 }) {
        const filtroBusca = normalizarFiltroItem(valorFiltro);
        const idRequisicao = ultimaRequisicao.current + 1;
        ultimaRequisicao.current = idRequisicao;
        setLoading(true);

        try {
            const itens = await carregarTodosItens();

            if (idRequisicao === ultimaRequisicao.current) {
                setTodosItens(itens);
                setFiltroAplicado(filtroBusca);
                setOffset(novoOffset);
                setAtualizadoEm(Date.now());
            }
        } catch (erro) {
            console.error('Erro ao buscar itens:', erro);

            if (idRequisicao === ultimaRequisicao.current) {
                setTodosItens(cacheItens?.itens || []);
            }
        } finally {
            if (idRequisicao === ultimaRequisicao.current) {
                setLoading(false);
            }
        }
    }

    const todosItensAgrupados = useMemo(() => Object.values(
        todosItens.reduce((acc, item) => {
            if (!acc[item.cod_item]) {
                acc[item.cod_item] = {
                    cod_item: item.cod_item,
                    cod_completo: item.cod_completo,
                    des_item: item.des_item,
                    principios_ativos: item.principios_ativos,
                    estoque_matriz: Number(item.qtd_estoque_matriz ?? 0),
                    estoque_filial: Number(item.qtd_estoque_filial ?? 0),
                    txt_observacao: item.txt_observacao || null
                };
            }

            if (!acc[item.cod_item].cod_completo && item.cod_completo) {
                acc[item.cod_item].cod_completo = item.cod_completo;
            }

            if (!acc[item.cod_item].principios_ativos && item.principios_ativos) {
                acc[item.cod_item].principios_ativos = item.principios_ativos;
            }

            if (!acc[item.cod_item].txt_observacao && item.txt_observacao) {
                acc[item.cod_item].txt_observacao = item.txt_observacao;
            }

            return acc;
        }, {})
    ), [todosItens]);

    const itensAgrupados = useMemo(() => {
        const termo = normalizarTextoBusca(filtroAplicado);
        if (!termo) return todosItensAgrupados;
        const usaBuscaPorPartes = termo.includes('%') || /\s/.test(termo);

        return todosItensAgrupados.filter(item => {
            const camposPesquisaveis = [
                item.cod_item,
                item.des_item,
                item.principios_ativos,
                item.cod_completo
            ];

            if (usaBuscaPorPartes) {
                return camposPesquisaveis.some(campo => correspondeAoLike(campo, termo));
            }

            return normalizarTextoBusca(camposPesquisaveis.join(' ')).includes(termo);
        });
    }, [todosItensAgrupados, filtroAplicado]);

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

    const itensPaginados = useMemo(
        () => itensOrdenados.slice(offset, offset + ITENS_POR_PAGINA),
        [itensOrdenados, offset]
    );

    const podeVoltar = offset > 0;
    const podeAvancar = offset + ITENS_POR_PAGINA < itensOrdenados.length;
    const precisaAtualizar = Date.now() - atualizadoEm >= CACHE_TTL;

    useEffect(() => {
        buscar({ filtro: FILTRO_PADRAO, novoOffset: 0 }).catch(() => {});
    }, []);

    useEffect(() => {
        if (isOpen) {
            setItensSelecionados({});
            setMenuSelecionarOpen(false);
            if (precisaAtualizar) {
                buscar({ filtro, novoOffset: offset }).catch(() => {});
            }
            // limpar acordos e últimas compras quando abrir sem cliente
            setAcordosMap({});
            setUltimasComprasMap({});
        }
    }, [isOpen]);

    // Buscar últimas compras de uma vez para o cliente
    useEffect(() => {
        if (!isOpen || !codCliente) {
            setUltimasComprasMap({});
            return;
        }

        let ativo = true;

        (async () => {
            try {
                // Verificar cache
                if (ultimasComprasClienteCache.has(codCliente)) {
                    const cached = ultimasComprasClienteCache.get(codCliente);
                    if (ativo) {
                        setUltimasComprasMap(cached);
                    }
                    return;
                }

                // Verificar se já há requisição em andamento
                if (requisicaoUltimasComprasCliente.has(codCliente)) {
                    const promise = requisicaoUltimasComprasCliente.get(codCliente);
                    const result = await promise;
                    if (ativo) {
                        setUltimasComprasMap(result);
                    }
                    return;
                }

                // Fazer requisição
                const promise = getClientesUltimasCompras({ codCliente })
                    .then(response => {
                        const items = response.data?.items || [];
                        const ultimasComprasAgrupadas = agruparUltimasComprasPorItem(items);

                        // Guardar todas as 5 compras por item (não apenas a primeira)
                        const mapPorItem = {};
                        Object.keys(ultimasComprasAgrupadas).forEach(codItem => {
                            const compras = ultimasComprasAgrupadas[codItem];
                            if (Array.isArray(compras) && compras.length > 0) {
                                mapPorItem[codItem] = compras; // Array completo de até 5 compras
                            }
                        });

                        ultimasComprasClienteCache.set(codCliente, mapPorItem);
                        requisicaoUltimasComprasCliente.delete(codCliente);
                        return mapPorItem;
                    })
                    .catch(err => {
                        console.error('Erro ao buscar últimas compras:', err);
                        requisicaoUltimasComprasCliente.delete(codCliente);
                        return {};
                    });

                requisicaoUltimasComprasCliente.set(codCliente, promise);
                const result = await promise;

                if (ativo) {
                    setUltimasComprasMap(result);
                }
            } catch (e) {
                console.error('Erro ao processar últimas compras:', e);
            }
        })();

        return () => { ativo = false; };
    }, [isOpen, codCliente]);

    useEffect(() => {
        // quando a página de itens ou cliente mudar, buscar acordos para os itens mostrados
        if (!isOpen) return;
        if (!codCliente) {
            setAcordosMap({});
            return;
        }

        let ativo = true;

        (async () => {
            const map = {};
            const itensParaBuscar = itensPaginados.map(i => i.cod_item);

            // marca como loading inicialmente
            itensParaBuscar.forEach(cod => { map[cod] = null; });
            setAcordosMap(map);

            const promessas = itensParaBuscar.map(async codItem => {
                const chave = `${codCliente}-${codItem}`;

                if (acordosCache.has(chave)) {
                    const cached = acordosCache.get(chave);
                    const acordos = (cached && typeof cached.then === 'function') ? await cached : cached;
                    return { codItem, acordos: acordos || [] };
                }

                const p = getItensAcordos({ codItem, codCliente, offset: 0, limit: 25 })
                    .then(resp => resp.data.items || [])
                    .catch(() => []);

                acordosCache.set(chave, p);

                const acordos = await p;
                acordosCache.set(chave, acordos);
                return { codItem, acordos };
            });

            const resultados = await Promise.all(promessas);

            if (!ativo) return;

            resultados.forEach(r => { map[r.codItem] = r.acordos; });

            setAcordosMap({ ...map });
        })();

        return () => { ativo = false; };
    }, [isOpen, itensPaginados, codCliente]);

    useEffect(() => {
        if (!isOpen || !itensPaginados.length) {
            setLoadingValores(false);
            return;
        }
        if (!codCliente || !codOper || !codCondPgto) {
            setLoadingValores(false);
            return;
        }

        let ativo = true;
        console.log('LovItens: iniciando fetch de preços', { codCliente, codOper, codCondPgto, itensPaginadosLength: itensPaginados.length });
        setLoadingValores(true);

        // use obterPrecoImpostosGlobal (shared helper) to fetch prices

        (async () => {
            try {
                const resultados = await Promise.all(itensPaginados.map(async item => {
                    const [lista201, lista203] = await Promise.all([
                        obterPrecoImpostosGlobal(item.cod_item, 201),
                        obterPrecoImpostosGlobal(item.cod_item, 203)
                    ]);

                    return { codItem: item.cod_item, lista201, lista203 };
                }));

                if (!ativo) return;

                setPrecosImpostosMap(prev => ({
                    ...prev,
                    ...Object.fromEntries(resultados.map(resultado => [resultado.codItem, {
                        lista201: resultado.lista201,
                        lista203: resultado.lista203
                    }]))
                }));
            } finally {
                if (ativo) {
                    setLoadingValores(false);
                }
            }
        })();

        return () => { ativo = false; };
    }, [isOpen, itensPaginados, codCliente, codOper, codCondPgto]);

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
            itensPaginados.forEach(item => {
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
        setOffset(0);
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
        return String(item.cod_completo ?? '').trim().toUpperCase() === FILTRO_PADRAO;
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
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                buscar({ filtro, novoOffset: 0 }).catch(() => {});
                            }
                        }}
                    />
                    <button
                        onClick={() => buscar({ filtro, novoOffset: 0 }).catch(() => {})}
                        disabled={loading}
                    >
                        {loading && <span className="lov-spinner lov-spinner-button"></span>}
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
                    {loading && (
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
                                 <th className="lov-value-col">Lista 201</th>
                                 <th className="lov-value-col">Lista 203</th>
                                 <th className="lov-date-col">Últ. compra</th>
                                 <th style={{width: '38px', textAlign: 'center'}}>Info</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensPaginados.map(item => {
                                const existe = itemJaExiste(item.cod_item);
                                const selecionado = itemEstaSelecionado(item.cod_item);
                                const marcaPropria = itemEhMarcaPropria(item);
                                const temAcordos = Array.isArray(acordosMap[item.cod_item]) && acordosMap[item.cod_item].length;
                                const comprasItem = Array.isArray(ultimasComprasMap[item.cod_item])
                                    ? ultimasComprasMap[item.cod_item].slice(0, 5)
                                    : [];
                                const temUltimaCompra = comprasItem.length > 0;
                                const precoItem = precosImpostosMap[item.cod_item];
                                const loadingLista201 = loadingValores && (precoItem?.lista201 == null);
                                const loadingLista203 = loadingValores && (precoItem?.lista203 == null);

                                return (
                                    <tr
                                                key={item.cod_item}
                                                className={[
                                                    existe ? 'lov-row-disabled' : selecionado ? 'lov-row-selected' : '',
                                                    marcaPropria ? 'lov-row-marca-propria' : '',
                                                    temAcordos ? 'lov-row-acordo' : '',
                                                    temUltimaCompra && !temAcordos ? 'lov-row-ultima-compra' : ''
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
                                         <td className="lov-value-col">
                                            {loadingLista201 ? (
                                                <span className="lov-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                                            ) : (
                                                formatarMoeda(precosImpostosMap[item.cod_item]?.lista201)
                                            )}
                                         </td>
                                         <td className="lov-value-col">
                                            {loadingLista203 ? (
                                                <span className="lov-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                                            ) : (
                                                formatarMoeda(precosImpostosMap[item.cod_item]?.lista203)
                                            )}
                                         </td>
                                         <td className="lov-date-col">{formatarData(comprasItem[0]?.dta_emissao)}</td>
                                         <td className="lov-info-cell">
                                            {acordosMap[item.cod_item] === null ? (
                                                <span className="lov-spinner" style={{width:16, height:16, borderWidth:2}}></span>
                                            ) : temAcordos || temUltimaCompra || item.txt_observacao ? (
                                                <div className="lov-info-wrap">
                                                    <span className={[
                                                        'lov-info-icon',
                                                        temAcordos ? 'lov-info-icon-acordo' : temUltimaCompra ? 'lov-info-icon-ultima-compra' : ''
                                                    ].filter(Boolean).join(' ')}>i</span>
                                                    <div className="lov-tooltip-info">
                                                        {item.txt_observacao ? (
                                                            <div className="lov-tooltip-acordo">
                                                                <div className="tip-linha"><span className="tip-nome">Observação:</span><span className="tip-valor">{item.txt_observacao}</span></div>
                                                            </div>
                                                        ) : null}
                                                        {Array.isArray(acordosMap[item.cod_item]) && acordosMap[item.cod_item].length ? (
                                                            <> 
                                                                <strong>Acordo(s) comercial(is)</strong>
                                                                {acordosMap[item.cod_item].map((ac, idx) => (
                                                                    <div key={idx} className="lov-tooltip-acordo">
                                                                        <div className="tip-linha"><span className="tip-nome">Pedido:</span><span className="tip-valor">{ac.num_pedido || '-'}</span></div>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        ) : null}
                                                        {temUltimaCompra ? (
                                                            <>
                                                                <strong>Última(s) compra(s)</strong>
                                                                <div className="lov-tooltip-ultima-compra">
                                                                    {comprasItem.map((compra, index) => (
                                                                        <div className="lov-historico-compra-linha" key={`${compra.dta_emissao}-${compra.vlr_unitario}-${index}`}>
                                                                            {compra.cod_unidade ?? compra.codUnidade ?? compra.cod_empresa ?? compra.codEmpresa ?? compra.unidade ?? '-'} - {formatarData(compra.dta_emissao)} - {formatarMoeda(compra.vlr_unitario)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </td>
                                        
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="lov-footer">
                    <button disabled={!podeVoltar} onClick={() => setOffset(offset - ITENS_POR_PAGINA)}>
                        <FaChevronLeft />
                    </button>
                    <span>
                        {itensOrdenados.length ? offset + 1 : 0}-{Math.min(offset + ITENS_POR_PAGINA, itensOrdenados.length)} de {itensOrdenados.length}
                    </span>
                    <button disabled={!podeAvancar} onClick={() => setOffset(offset + ITENS_POR_PAGINA)}>
                        <FaChevronRight />
                    </button>
                </div>
            </div>
        </div>
    );
}
