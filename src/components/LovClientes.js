import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useEffect, useMemo, useRef, useState } from 'react';
import { getClientes } from '../services/clientes';

const CLIENTES_POR_PAGINA = 25;
const CACHE_TTL = 5 * 60 * 1000;
let cacheClientes = null;
let requisicaoClientes = null;

function normalizarTextoBusca(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

export function LovClientes({ isOpen, setLovOpen, onSelect }) {
    const [filtro, setFiltro] = useState('');
    const [todosClientes, setTodosClientes] = useState([]);
    const [filtroAplicado, setFiltroAplicado] = useState('');
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [atualizadoEm, setAtualizadoEm] = useState(0);
    const ultimaRequisicao = useRef(0);

    async function carregarTodosClientes() {
        if (cacheClientes && cacheClientes.expiraEm > Date.now()) return cacheClientes.clientes;
        if (requisicaoClientes) return requisicaoClientes;

        requisicaoClientes = getClientes()
            .then(response => {
                const resposta = response.data || {};
                const clientes = Array.isArray(resposta) ? resposta : (resposta.items || []);
                cacheClientes = { clientes, expiraEm: Date.now() + CACHE_TTL };
                return clientes;
            })
            .finally(() => { requisicaoClientes = null; });

        return requisicaoClientes;
    }

    async function buscar({ filtro: valorFiltro, novoOffset = 0 }) {
        const idRequisicao = ultimaRequisicao.current + 1;
        ultimaRequisicao.current = idRequisicao;
        setLoading(true);

        try {
            const clientes = await carregarTodosClientes();
            if (idRequisicao === ultimaRequisicao.current) {
                setTodosClientes(clientes);
                setFiltroAplicado(String(valorFiltro ?? '').trim());
                setOffset(novoOffset);
                setAtualizadoEm(Date.now());
            }
        } finally {
            if (idRequisicao === ultimaRequisicao.current) setLoading(false);
        }
    }

    const clientesFiltrados = useMemo(() => {
        const termo = normalizarTextoBusca(filtroAplicado);
        if (!termo) return todosClientes;
        return todosClientes.filter(cliente => normalizarTextoBusca(
            `${cliente.cod_pessoa ?? ''} ${cliente.des_pessoa ?? ''}`
        ).includes(termo));
    }, [todosClientes, filtroAplicado]);

    const clientesPaginados = useMemo(
        () => clientesFiltrados.slice(offset, offset + CLIENTES_POR_PAGINA),
        [clientesFiltrados, offset]
    );

    const precisaAtualizar = Date.now() - atualizadoEm >= CACHE_TTL;
    const podeVoltar = offset > 0;
    const podeAvancar = offset + CLIENTES_POR_PAGINA < clientesFiltrados.length;

    useEffect(() => {
        buscar({ filtro: '', novoOffset: 0 }).catch(() => {});
    }, []);

    useEffect(() => {
        if (isOpen && precisaAtualizar) {
            buscar({ filtro, novoOffset: offset }).catch(() => {});
        }
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
                            buscar({ filtro, novoOffset: 0 })
                        }
                    />
                    <button onClick={() => buscar({ filtro, novoOffset: 0 })} disabled={loading}>
                        {loading && <span className="lov-spinner lov-spinner-button"></span>}
                        BUSCAR
                    </button>
                </div>

                <div className="lov-list">
                    {loading && <div className="lov-loading"><span className="lov-spinner"></span></div>}
                    <table>
                        <tbody>
                            {clientesPaginados.map(clientes => (
                                <tr key={clientes.cod_pessoa} onClick={() => { onSelect(clientes); setLovOpen(false); }}>
                                    <td>{clientes.cod_pessoa}</td>
                                    <td>{clientes.des_pessoa}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="lov-footer">
                    <button disabled={!podeVoltar} onClick={() => setOffset(offset - CLIENTES_POR_PAGINA)}>
                        <FaChevronLeft />
                    </button>

                    <span>
                        {clientesFiltrados.length ? offset + 1 : 0}-{Math.min(offset + CLIENTES_POR_PAGINA, clientesFiltrados.length)} de {clientesFiltrados.length}
                    </span>

                    <button disabled={!podeAvancar} onClick={() => setOffset(offset + CLIENTES_POR_PAGINA)}>
                        <FaChevronRight />
                    </button>
                </div>
            </div>
        </div>
    );
}
