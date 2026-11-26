import { TabelaOrdenavel } from './TabelaOrdenavel';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { consultarVendasCliente } from '../../services/demandaContratos/vendas';
import { invalidarConsultas } from '../../services/consultaCache';
import { montarSugestoes, periodoVisita } from '../../domain/demandaContratos/sugestoes';
import { itemParaAcordo } from '../../domain/demandaContratos/acordo';
import { ItensAcordo } from './ItensAcordo';

const numero = valor => Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const moeda = valor => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = valor => valor ? valor.slice(0, 10).split('-').reverse().join('/') : '—';

function ListaSugestoes({ cabecalhos, children, quantidade, rotulo }) {
    const tabelaRef = useRef(null);
    useLayoutEffect(() => {
        const tabela = tabelaRef.current;
        const ajustar = () => {
            const altura = tabela.tHead.getBoundingClientRect().height + [...tabela.tBodies[0].rows].slice(0, 10).reduce((s, linha) => s + linha.getBoundingClientRect().height, 0);
            if (altura > 0) tabela.parentElement.style.maxHeight = `${Math.ceil(altura) + 1}px`;
        };
        ajustar();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(ajustar); observer.observe(tabela);
        return () => observer.disconnect();
    }, [children]);
    return <><p className="demanda-orientacao">{quantidade} item(ns)</p>
        <div className="demanda-tabela-scroll demanda-itens-rolagem" tabIndex={0} aria-label={rotulo}>
            <TabelaOrdenavel ordemInicial={cabecalhos.includes('Meses com compra') ? { coluna: 'Meses com compra', direcao: 'desc' } : undefined} ref={tabelaRef} className="demanda-tabela demanda-sugestoes-tabela"><thead><tr>{cabecalhos.map(titulo => <th key={titulo}>{titulo}</th>)}</tr></thead><tbody>{children}</tbody></TabelaOrdenavel>
        </div></>;
}

export function SugestaoVisita({ codigo, itensContratos, cliente, representantes }) {
    const [selecao, setSelecao] = useState({});
    function selecionar(item, origem) {
        const dados = itemParaAcordo(item, origem);
        setSelecao(atual => {
            if (atual[dados.codigo]) { const copia = { ...atual }; delete copia[dados.codigo]; return copia; }
            return { ...atual, [dados.codigo]: dados };
        });
    }
    const [periodo] = useState(() => periodoVisita());
    const [vendas, setVendas] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [tentativa, setTentativa] = useState(0);
    useEffect(() => {
        let ativo = true;
        setCarregando(true); setErro(''); setVendas(null);
        consultarVendasCliente(codigo, periodo).then(itens => { if (ativo) setVendas(itens); })
            .catch(() => { if (ativo) setErro('Não foi possível carregar as vendas do cliente. Tente novamente.'); })
            .finally(() => { if (ativo) setCarregando(false); });
        return () => { ativo = false; };
    }, [codigo, periodo, tentativa]);
    const sugestoes = montarSugestoes(vendas || [], itensContratos, periodo);
    return <section className="pedido-card demanda-sugestoes" aria-labelledby="demanda-sugestoes-titulo">
        <h2 className="pedido-title" id="demanda-sugestoes-titulo">Sugestão de visita</h2>
        <div className="demanda-filtros"><p className="demanda-orientacao">Vendas de {data(periodo.inicio)} a {data(periodo.fim)} · {periodo.meses} meses, incluindo o mês atual parcial.</p>
            <button type="button" className="btn-recalcular-itens" disabled={carregando} onClick={() => { invalidarConsultas(`notasSaida|${codigo}|`); setTentativa(v => v + 1); }}>Atualizar vendas</button>
        </div>
        {carregando && <p role="status">Carregando vendas dos últimos {periodo.meses} meses...</p>}
        {erro && <p className="demanda-erro" role="alert">{erro}</p>}
        {vendas !== null && <>
            <dl className="demanda-indicadores demanda-vendas-indicadores">
                {[[moeda(sugestoes.total), `Comprado no período (${periodo.meses} meses)`], [moeda(sugestoes.total / periodo.meses), 'Média de compra por mês'],
                    [moeda(sugestoes.emContrato), 'Em itens de contrato'], [moeda(sugestoes.foraContrato), 'Fora de contrato']].map(([valor, titulo]) => <div key={titulo}><dt>{titulo}</dt><dd>{valor}</dd></div>)}
            </dl>
            <h4 className="demanda-subtitulo">Potencial para novo contrato</h4>
            <p className="demanda-orientacao">Todos os itens com venda registrada no período e sem contrato vigente, do maior para o menor valor comprado.</p>
            {!sugestoes.fora.length ? <p>Nenhum item vendido fora de contrato no período.</p> : <ListaSugestoes quantidade={sugestoes.fora.length} rotulo="Itens vendidos sem contrato" cabecalhos={['Selecionar', 'Item', 'Marca', 'Meses com compra', 'Qtd média /mês', 'Último preço pago', 'Valor comprado', 'Última compra']}>
                {sugestoes.fora.map(item => <tr key={item.codigo}><td><input type="checkbox" aria-label={`Selecionar novo item ${item.codigo}`} checked={!!selecao[item.codigo]} onChange={() => selecionar(item, 'novo')} /></td><td><small>{item.codigo}</small> {item.descricao}</td><td>{item.marca || 'Não informada'}</td><td>{item.meses.size} de {periodo.meses}</td><td>{numero(item.media)}</td><td>{item.ultimoPreco === null ? '—' : moeda(item.ultimoPreco)}</td><td>{moeda(item.valor)}</td><td>{data(item.ultimaData)}</td></tr>)}
            </ListaSugestoes>}
        </>}
        <h4 className="demanda-subtitulo">Itens de contrato para ampliar</h4>
        <p className="demanda-orientacao">Itens vigentes classificados como Acima: efetividade maior que 110%, respeitando a tolerância de 10%.</p>
        {!sugestoes.acima.length ? <p>Nenhum item vigente com efetividade acima de 110%.</p> : <ListaSugestoes quantidade={sugestoes.acima.length} rotulo="Itens acima do contratado" cabecalhos={['Selecionar', 'Item', 'Marca', 'Pedidos', 'Contrat./mês', 'Média 3m', 'Efetividade', 'Excedente /mês (R$)']}>
            {sugestoes.acima.map((item, indice) => <tr key={`${item.origem}-${item.num_pedido}-${item.cod_item}-${indice}`}><td><input type="checkbox" aria-label={`Selecionar item ${item.cod_item} para ampliar contrato ${item.num_pedido}`} checked={!!selecao[item.cod_item]} onChange={() => selecionar(item, 'ampliar')} /></td><td><small>{item.cod_item}</small> {item.des_item}</td><td>{item.cod_completo || 'Não informada'}</td><td>{item.origem}: {item.num_pedido}{item.origem === '14' && <small className="demanda-item-pedidos">37: {item.pedido37 ?? 'Sem vínculo'}</small>}</td><td>{numero(item.quantidade)}{item.quantidadeContratada === null && <small className="demanda-item-pedidos">Base: reserva</small>}</td><td>{numero(item.media)}</td><td>{numero(item.efetividade)}%</td><td>{moeda(item.excedente)}</td></tr>)}
        </ListaSugestoes>}
        <ItensAcordo selecao={selecao} setSelecao={setSelecao} cliente={cliente} representantes={representantes} />
        {vendas !== null && <p className="demanda-orientacao">Valores de vendas líquidos das devoluções retornadas pela API. Último preço: valor ÷ quantidade das vendas positivas na última data de compra. Médias de vendas divididas pelos {periodo.meses} meses, incluindo meses sem compra.</p>}
    </section>;
}
