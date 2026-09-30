import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listarPedidos } from '../services/pedidosWeb';
import '../style/pedidoVenda.css';

export function Pedidos() {
    const navigate = useNavigate();
    const { search } = useLocation();
    const [pagina, setPagina] = useState(0);
    const [atualizacao, setAtualizacao] = useState(0);
    const [dados, setDados] = useState({ items: [], hasMore: false });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    useEffect(() => {
        let ativo = true;
        setCarregando(true);
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
            <table className="itens-grid"><thead><tr>
                <th>Sequencial</th><th>Cliente</th><th>Emissão</th><th>Matriz</th><th>Filial</th><th>Status</th><th>Abrir</th>
            </tr></thead><tbody>{dados.items.map(pedido => <tr key={pedido.numSeqPedido}>
                <td>{pedido.numSeqPedido}</td><td>{pedido.codCliente}</td>
                <td>{pedido.dtaEmissao ? String(pedido.dtaEmissao).slice(0, 10) : '—'}</td>
                <td>{pedido.numPedidoMatriz ?? '—'}</td><td>{pedido.numPedidoFilial ?? '—'}</td>
                <td>{['Rascunho', 'Integrado parcial', 'Integrado total'][pedido.statusCotacao] ?? '—'}</td>
                <td><button className="btn-adicionar" onClick={() => navigate(`/pedido/${pedido.numSeqPedido}${search}`)}>Abrir</button></td>
            </tr>)}</tbody></table>
            {!dados.items.length && <p>Nenhum pedido encontrado.</p>}
        </div>}
        <div className="obs-footer">
            <button className="btn-adicionar" disabled={carregando || !pagina} onClick={() => setPagina(v => v - 1)}>Anterior</button>
            <button className="btn-adicionar" disabled={carregando || !dados.hasMore} onClick={() => setPagina(v => v + 1)}>Próxima</button>
        </div>
    </div></div>;
}
