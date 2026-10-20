import { useEffect, useMemo, useRef, useState } from 'react';
import FiltroColunaPedidos from '../components/FiltroColunaPedidos';
import { useLocation, useNavigate } from 'react-router-dom';
import { listarTodosPedidos } from '../services/pedidosWeb';
import '../style/pedidoVenda.css';
import '../style/pedidos.css';

const PEDIDOS_POR_PAGINA = 13;
const COLUNAS = [
    ['numSeqPedido', 'Sequencial'], ['codCliente', 'Cliente'], ['desPessoa', 'Descrição'],
    ['desRepresentante', 'Representante'], ['codUf', 'UF'], ['desCidade', 'Cidade'],
    ['desConsultor', 'Consultor'], ['dtaEmissao', 'Emissão'], ['numPedidoMatriz', 'Matriz'],
    ['numPedidoFilial', 'Filial'], ['statusCotacao', 'Status']
];
const normalizarTexto = valor => String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function valorColuna(pedido, campo) {
    if (campo === 'statusCotacao') return ['Rascunho', 'Integrado', 'Integrado'][pedido[campo]] ?? '—';
    if (campo === 'dtaEmissao') return pedido[campo] ? String(pedido[campo]).slice(0, 10).split('-').reverse().join('/') : '—';
    return String(pedido[campo] ?? '').trim() || '—';
}

export function Pedidos() {
    const navigate = useNavigate();
    const { search } = useLocation();
    const [pagina, setPagina] = useState(0);
    const [atualizacao, setAtualizacao] = useState(0);
    const [pedidos, setPedidos] = useState([]);
    const [filtros, setFiltros] = useState({});
    const pedidosFiltrados = useMemo(() => pedidos.filter(pedido => COLUNAS.every(([campo]) => {
        if (campo === 'dtaEmissao') {
            const { de, ate } = filtros[campo] || {};
            if (!de && !ate) return true;
            const data = String(pedido[campo] || '').slice(0, 10);
            return !!data && (!de || data >= de) && (!ate || data <= ate);
        }
        return normalizarTexto(valorColuna(pedido, campo)).includes(normalizarTexto(filtros[campo] || ''));
    })), [pedidos, filtros]);
    const totalPaginas = Math.ceil(pedidosFiltrados.length / PEDIDOS_POR_PAGINA);
    const inicio = pagina * PEDIDOS_POR_PAGINA;
    const pedidosPagina = pedidosFiltrados.slice(inicio, inicio + PEDIDOS_POR_PAGINA);
    useEffect(() => { setPagina(v => Math.min(v, Math.max(0, totalPaginas - 1))); }, [totalPaginas]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [menu, setMenu] = useState(null);
    const menuRef = useRef(null);
    const linhaRef = useRef(null);
    useEffect(() => {
        if (!menu) return;
        menuRef.current?.querySelector('button')?.focus();
        const fechar = event => {
            if (!menuRef.current?.contains(event.target)) setMenu(null);
        };
        const teclado = event => {
            if (event.key === 'Escape') {
                setMenu(null);
                linhaRef.current?.focus();
            }
        };
        const reposicionar = () => setMenu(null);
        document.addEventListener('pointerdown', fechar);
        document.addEventListener('keydown', teclado);
        window.addEventListener('resize', reposicionar);
        window.addEventListener('scroll', reposicionar, true);
        return () => {
            document.removeEventListener('pointerdown', fechar);
            document.removeEventListener('keydown', teclado);
            window.removeEventListener('resize', reposicionar);
            window.removeEventListener('scroll', reposicionar, true);
        };
    }, [menu]);
    function abrirMenu(event, pedido) {
        linhaRef.current = event.currentTarget;
        const rect = event.currentTarget.getBoundingClientRect();
        setMenu({ pedido,
            x: Math.max(8, Math.min(event.clientX || rect.left, window.innerWidth - 208)),
            y: Math.max(8, Math.min(event.clientY || rect.bottom, window.innerHeight - 60))
        });
    }
    useEffect(() => {
        let ativo = true;
        setCarregando(true);
        setMenu(null);
        setErro('');
        listarTodosPedidos().then(resultado => {
            if (ativo) {
                setPedidos(resultado);
                setPagina(v => Math.min(v, Math.max(0, Math.ceil(resultado.length / PEDIDOS_POR_PAGINA) - 1)));
            }
        }).catch(() => { if (ativo) setErro('Não foi possível carregar os pedidos.'); })
            .finally(() => { if (ativo) setCarregando(false); });
        return () => { ativo = false; };
    }, [atualizacao]);
    return <div className="pedido-venda-container"><div className="pedido-card">
        <h2 className="pedido-title">Pedidos</h2>
        <div className="pedidos-toolbar">
        <div className="obs-footer pedidos-acoes">
            <button className="btn-adicionar" onClick={() => navigate(`/pedido${search}`)}>Nova cotação</button>
            <button className="btn-adicionar" disabled={carregando} onClick={() => setAtualizacao(v => v + 1)}>Atualizar</button>
        </div>
        <div className="pedidos-paginacao">
            <select aria-label="Página de pedidos" value={pagina} disabled={carregando || !!erro || !pedidosFiltrados.length}
                onChange={event => { setMenu(null); setPagina(Number(event.target.value)); }}>
                {!pedidosFiltrados.length && <option value={0}>0-0 de 0</option>}
                {Array.from({ length: totalPaginas }, (_, indice) => <option key={indice} value={indice}>
                    {indice * PEDIDOS_POR_PAGINA + 1}-{Math.min((indice + 1) * PEDIDOS_POR_PAGINA, pedidosFiltrados.length)} de {pedidosFiltrados.length}
                </option>)}
            </select>
        </div>
        </div>
        {erro && <p role="alert">{erro}</p>}
        {carregando ? <p>Carregando pedidos...</p> : !erro && <div className="itens-table-wrapper">
            <table className="itens-grid pedidos-grid"><thead><tr>
                {COLUNAS.map(([campo, titulo]) => <th key={campo}>
                    <FiltroColunaPedidos titulo={titulo} filtro={filtros[campo] || ''} intervaloData={campo === 'dtaEmissao'}
                        valores={[...new Set(pedidos.map(pedido => valorColuna(pedido, campo)))]
                            .filter(valor => normalizarTexto(valor).includes(normalizarTexto(filtros[campo] || '')))
                            .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))}
                        onChange={valor => {
                            setFiltros(anteriores => ({ ...anteriores, [campo]: valor }));
                            setPagina(0);
                            setMenu(null);
                        }} />
                </th>)}
            </tr></thead><tbody>{pedidosPagina.map(pedido => <tr key={pedido.numSeqPedido}
                className="pedidos-linha" tabIndex={0} aria-haspopup="menu"
                aria-expanded={menu?.pedido.numSeqPedido === pedido.numSeqPedido}
                aria-label={`Opções da cotação ${pedido.numSeqPedido}`}
                onClick={event => abrirMenu(event, pedido)}
                onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        abrirMenu(event, pedido);
                    }
                }}>
                {COLUNAS.map(([campo]) => <td key={campo}>{valorColuna(pedido, campo)}</td>)}
            </tr>)}</tbody></table>
            {!pedidosFiltrados.length && <p>Nenhum pedido encontrado.</p>}
        </div>}
        {menu && <div ref={menuRef} role="menu" aria-label={`Cotação ${menu.pedido.numSeqPedido}`}
            className="pedidos-menu" style={{ left: menu.x, top: menu.y }}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(null); }}>
            <button type="button" role="menuitem" onClick={() => navigate(`/pedido/${menu.pedido.numSeqPedido}${search}`)}>Cadastro</button>
        </div>}

    </div></div>;
}
