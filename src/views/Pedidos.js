import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listarPedidos } from '../services/pedidosWeb';
import '../style/pedidoVenda.css';
import '../style/pedidos.css';

export function Pedidos() {
    const navigate = useNavigate();
    const { search } = useLocation();
    const [pagina, setPagina] = useState(0);
    const [atualizacao, setAtualizacao] = useState(0);
    const [dados, setDados] = useState({ items: [], hasMore: false });
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
        listarPedidos({ offset: pagina * 25, limit: 25 }).then(resultado => {
            if (ativo) setDados(resultado);
        }).catch(() => { if (ativo) setErro('Não foi possível carregar os pedidos.'); })
            .finally(() => { if (ativo) setCarregando(false); });
        return () => { ativo = false; };
    }, [pagina, atualizacao]);
    return <div className="pedido-venda-container"><div className="pedido-card">
        <h2 className="pedido-title">Pedidos</h2>
        <div className="obs-footer">
            <button className="btn-adicionar" onClick={() => navigate(`/pedido${search}`)}>Nova cotação</button>
            <button className="btn-adicionar" disabled={carregando} onClick={() => setAtualizacao(v => v + 1)}>Atualizar</button>
        </div>
        {erro && <p role="alert">{erro}</p>}
        {carregando ? <p>Carregando pedidos...</p> : !erro && <div className="itens-table-wrapper">
            <table className="itens-grid pedidos-grid"><thead><tr>
                <th>Sequencial</th><th>Cliente</th><th>Descrição</th><th>Emissão</th><th>Matriz</th><th>Filial</th><th>Status</th>
            </tr></thead><tbody>{dados.items.map(pedido => <tr key={pedido.numSeqPedido}
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
                <td>{pedido.numSeqPedido}</td><td>{pedido.codCliente}</td><td>{pedido.desPessoa || '—'}</td>
                <td>{pedido.dtaEmissao ? String(pedido.dtaEmissao).slice(0, 10) : '—'}</td>
                <td>{pedido.numPedidoMatriz ?? '—'}</td><td>{pedido.numPedidoFilial ?? '—'}</td>
                <td>{['Rascunho', 'Integrado', 'Integrado'][pedido.statusCotacao] ?? '—'}</td>
            </tr>)}</tbody></table>
            {!dados.items.length && <p>Nenhum pedido encontrado.</p>}
        </div>}
        {menu && <div ref={menuRef} role="menu" aria-label={`Cotação ${menu.pedido.numSeqPedido}`}
            className="pedidos-menu" style={{ left: menu.x, top: menu.y }}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(null); }}>
            <button type="button" role="menuitem" onClick={() => navigate(`/pedido/${menu.pedido.numSeqPedido}${search}`)}>Cadastro</button>
        </div>}
        <div className="obs-footer">
            <button className="btn-adicionar" disabled={carregando || !pagina} onClick={() => setPagina(v => v - 1)}>Anterior</button>
            <button className="btn-adicionar" disabled={carregando || !dados.hasMore} onClick={() => setPagina(v => v + 1)}>Próxima</button>
        </div>
    </div></div>;
}
