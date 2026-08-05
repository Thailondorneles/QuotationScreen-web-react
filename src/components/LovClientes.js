import '../style/lovStyle.css';
import { FaX, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllClientesCached } from '../services/clientes';

const CLIENTES_POR_PAGINA = 25;
const CACHE_TTL = 5 * 60 * 1000;

function normalizarTextoBusca(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

function escaparRegex(valor) {
    return String(valor ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function correspondeAoLike(valor, filtro) {
    const texto = normalizarTextoBusca(valor);
    let padrao = normalizarTextoBusca(filtro).replace(/\s+/g, '%');

    if (!padrao.includes('%')) {
        return texto.includes(padrao);
    }

    if (!padrao.endsWith('%')) padrao += '%';

    const regexLike = padrao
        .split('%')
        .map(escaparRegex)
        .join('.*');

    return new RegExp(`^${regexLike}$`).test(texto);
}

function normalizarFiltroItem(valor) {
    return String(valor ?? '').trim();
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
        return getAllClientesCached();
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
        const termoRaw = normalizarFiltroItem(filtroAplicado);
        if (!termoRaw) return todosClientes;

        return todosClientes.filter(cliente => {
            const campos = [
                String(cliente.cod_pessoa ?? ''),
                cliente.des_pessoa ?? '',
                cliente.cnpj ?? '',
                cliente.cod_uf ?? '',
                cliente.des_cidade ?? ''
            ];

            return campos.some(campo => correspondeAoLike(campo, termoRaw));
        });
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
                        <thead>
                            <tr>
                                <th>Cód.</th>
                                <th>Nome</th>
                                <th>CNPJ</th>
                                <th>UF</th>
                                <th>Cidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientesPaginados.map(cli => (
                                <tr key={cli.cod_pessoa} onClick={() => { onSelect(cli); setLovOpen(false); }}>
                                    <td>{cli.cod_pessoa}</td>
                                    <td>{cli.des_pessoa}</td>
                                    <td>{cli.cnpj || '-'}</td>
                                    <td>{cli.cod_uf || '-'}</td>
                                    <td>{cli.des_cidade || '-'}</td>
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
