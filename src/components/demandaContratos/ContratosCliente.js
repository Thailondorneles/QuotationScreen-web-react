import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { carregarContratosCliente } from '../../services/demandaContratos/contratos';
import { invalidarConsultas } from '../../services/consultaCache';
import { mesesRecentes, resumirContratos, montarContratosDemanda, classificarEfetividade, valorContratadoVigencia, resumirMarca } from '../../domain/demandaContratos/contratos';

const numero = valor => valor == null ? '—' : Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const moeda = valor => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = valor => valor ? String(valor).slice(0, 10).split('-').reverse().join('/') : 'Não informada';
const mesNome = chave => chave ? `${['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][Number(chave.slice(5)) - 1]}/${chave.slice(2, 4)}` : 'Nunca';

function Efetividade({ media, valor }) {
    const status = classificarEfetividade(media, valor);
    return <div className={`demanda-status demanda-status-${status.chave}`}><strong>{valor == null ? '—' : `${numero(valor)}%`}</strong><span>{status.nome}</span></div>;
}

function BarraEfetividade({ itens, valor }) {
    const contagens = new Map();
    itens.forEach(item => {
        const status = classificarEfetividade(item.media, item.efetividade);
        if (!contagens.has(status.chave)) contagens.set(status.chave, { ...status, quantidade: 0 });
        contagens.get(status.chave).quantidade += 1;
    });
    const ordem = ['acima', 'dentro', 'abaixo', 'sem-consumo', 'nao-iniciado', 'sem-base'];
    const partes = ordem.map(chave => contagens.get(chave)).filter(Boolean);
    const descricao = partes.map(parte => `${parte.nome}: ${parte.quantidade} item(ns)`).join('; ');
    return <div className="demanda-efetividade-geral">
        <strong>{valor == null ? '—' : `${numero(valor)}%`}</strong>
        <div className="demanda-barra-status" role="group" aria-label={`Classificação dos itens. ${descricao}`}>
            {partes.map(parte => <span key={parte.chave} className={`demanda-segmento demanda-segmento-${parte.chave}`}
                style={{ flexGrow: parte.quantidade }} tabIndex={0} title={`${parte.nome}: ${parte.quantidade} item(ns)`} aria-label={`${parte.nome}: ${parte.quantidade} item(ns)`}>
                <span className="demanda-barra-tooltip" role="tooltip">{parte.nome}: {parte.quantidade} item(ns)</span>
            </span>)}
        </div>
    </div>;
}

function TabelaItens({ itens, meses, reserva = false, porMarca = false }) {
    const [historico, setHistorico] = useState(false);
    const tabelaRef = useRef(null);
    useLayoutEffect(() => {
        const tabela = tabelaRef.current;
        const ajustarAltura = () => {
            const linhas = [...tabela.tBodies[0].rows].slice(0, 10);
            const altura = tabela.tHead.getBoundingClientRect().height + linhas.reduce((soma, linha) => soma + linha.getBoundingClientRect().height, 0);
            if (altura > 0) tabela.parentElement.style.maxHeight = `${Math.ceil(altura) + 1}px`;
        };
        ajustarAltura();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(ajustarAltura);
        observer.observe(tabela);
        return () => observer.disconnect();
    }, [itens, historico]);
    return <>
        <div className="demanda-tabela-acoes"><label><input type="checkbox" checked={historico} onChange={event => setHistorico(event.target.checked)} /> Mostrar consumo mês a mês</label><span>{itens.length} registro(s)</span></div>
        <div className="demanda-tabela-scroll demanda-itens-rolagem" tabIndex={0} aria-label="Itens com rolagem"><table ref={tabelaRef} className={`demanda-tabela${historico ? ' demanda-com-historico' : ''}`}>
        <colgroup><col className="demanda-col-codigo" /><col className="demanda-col-item" /><col className="demanda-col-marca" /><col />{!reserva && <col />}<col />{historico && meses.map(mes => <col key={mes} />)}<col />{!reserva && <col />}<col /><col /></colgroup>
        <thead><tr><th scope="col">Código</th><th scope="col">Item</th><th scope="col">Marca</th><th scope="col">Pr. unit.</th>{!reserva && <th scope="col">Contrat./mês</th>}<th scope="col">Reserva/mês</th>
            {historico && meses.map((mes, i) => <th scope="col" key={mes}>{mesNome(mes)}{i === meses.length - 1 ? '*' : ''}</th>)}
            <th>Média 3m</th>{!reserva && <th>Efetividade</th>}<th title="Consumo total em quantidade × preço unitário do contrato">Consumido (R$)</th><th>Último consumo</th></tr></thead>
        <tbody>{itens.map((item, i) => <tr key={`${item.cod_item}-${i}`}>
            <td>{item.cod_item}</td><td>{item.des_item}{porMarca && <small className="demanda-item-pedidos">{item.origem === '14' ? `14: ${item.num_pedido} · 37: ${item.pedido37 ?? 'Sem vínculo'}` : `37: ${item.num_pedido} · Sem pedido de reserva`}</small>}</td><td>{item.cod_completo || 'Não informada'}</td><td>{moeda(item.vlr_uni_bruto)}</td>{!reserva && <td>{numero(item.quantidadeContratada === undefined ? item.quantidade : item.quantidadeContratada)}</td>}<td>{numero(reserva ? item.quantidade : item.reservaMensal)}</td>
            {historico && meses.map(mes => <td key={mes}>{numero(item.consumos[mes] || 0)}</td>)}
            <td>{numero(item.media)}</td>{!reserva && <td><Efetividade media={item.media} valor={item.efetividade} /></td>}<td>{moeda(item.totalConsumido * (Number(item.vlr_uni_bruto) || 0))}</td><td>{mesNome(Object.keys(item.consumos).filter(mes => item.consumos[mes] > 0).sort().pop())}</td>
        </tr>)}</tbody>
    </table></div></>;
}

function TabelaMarcas({ marcas, meses }) {
    const [abertas, setAbertas] = useState({});
    const tabelaRef = useRef(null);
    useLayoutEffect(() => {
        const tabela = tabelaRef.current;
        const ajustarAltura = () => {
            const linhas = [...tabela.tBodies[0].rows].filter(linha => linha.hasAttribute('data-marca')).slice(0, 10);
            const altura = tabela.tHead.getBoundingClientRect().height + linhas.reduce((soma, linha) => soma + linha.getBoundingClientRect().height, 0);
            if (altura > 0) tabela.parentElement.style.maxHeight = `${Math.ceil(altura) + 1}px`;
        };
        ajustarAltura();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(ajustarAltura);
        observer.observe(tabela);
        return () => observer.disconnect();
    }, [marcas]);
    const linhas = [...marcas.entries()].map(([marca, itens]) => ({ marca, itens, resumo: resumirMarca(itens) }))
        .sort((a, b) => b.resumo.contratado - a.resumo.contratado || a.marca.localeCompare(b.marca));
    return <>
        <p className="demanda-orientacao">Clique na marca para ver os itens, com o acordado × o consumido e os valores.</p>
        <div className="demanda-tabela-scroll demanda-marcas-rolagem" tabIndex={0} aria-label="Marcas com rolagem"><table ref={tabelaRef} className="demanda-tabela demanda-marcas-resumo">
            <thead><tr><th>Marca</th><th>Itens</th><th>Contratado /mês (qtd)</th><th>Consumo médio /mês (qtd)</th><th>Efetividade</th><th>Contratado /mês (R$)</th><th>Consumo médio /mês (R$)</th><th>Consumido no período (R$)</th></tr></thead>
            <tbody>{linhas.map(({ marca, itens, resumo }) => <Fragment key={marca}>
                <tr data-marca={marca} className={abertas[marca] ? 'demanda-contrato-aberto' : undefined}>
                    <td><button type="button" className="demanda-pedido-expandir" aria-expanded={!!abertas[marca]} onClick={() => setAbertas(atual => ({ ...atual, [marca]: !atual[marca] }))}><span aria-hidden="true">{abertas[marca] ? '▾' : '▸'}</span> <strong>{marca}</strong></button></td>
                    <td>{numero(resumo.itens)}</td><td>{numero(resumo.quantidade)}</td><td>{numero(resumo.media)}</td>
                    <td><BarraEfetividade itens={itens} valor={resumo.efetividade} /></td>
                    <td>{moeda(resumo.contratado)}</td><td>{moeda(resumo.consumoMedio)}</td><td>{moeda(resumo.consumido)}</td>
                </tr>
                {abertas[marca] && <tr><td colSpan={8} className="demanda-itens-expandidos"><TabelaItens itens={itens} meses={meses} porMarca /></td></tr>}
            </Fragment>)}</tbody>
        </table></div>
    </>;
}

function TabelaContratos({ contratos, meses }) {
    const [abertos, setAbertos] = useState({});
    return <>
        <p className="demanda-orientacao">Clique no pedido para ver os itens do contrato.</p>
        <div className="demanda-tabela-scroll"><table className="demanda-tabela demanda-contratos-resumo">
            <thead><tr><th>Pedidos</th><th>Vigência</th><th>Itens</th><th>Contratado na vigência</th><th>Consumido</th><th>Efetividade</th></tr></thead>
            <tbody>{contratos.map(contrato => {
                const aberto = !!abertos[contrato.chave];
                const iniciados = contrato.itens.filter(item => item.media !== null);
                const base = iniciados.reduce((s, item) => s + item.quantidade, 0);
                const efetividade = base > 0 ? iniciados.reduce((s, item) => s + item.media, 0) / base * 100 : null;
                return <Fragment key={contrato.chave}>
                    <tr className={aberto ? 'demanda-contrato-aberto' : undefined}>
                        <td><button type="button" className="demanda-pedido-expandir" aria-expanded={aberto} onClick={() => setAbertos(atual => ({ ...atual, [contrato.chave]: !aberto }))}>
                            <span aria-hidden="true">{aberto ? '▾' : '▸'}</span> {contrato.pedidos14.length ? '14:' : '37:'} <strong>{contrato.pedidos14.length ? contrato.pedidos14.join(', ') : contrato.pedido}</strong>
                        </button><small>{contrato.pedidos14.length ? `37: ${contrato.pedidos37.join(', ') || 'Sem contrato vinculado'}` : 'Sem pedido de reserva'}</small></td>
                        <td>{data(contrato.inicio)} a {data(contrato.fim)}<small>{contrato.itens[0]?.vencido ? 'Vencido' : contrato.fim ? 'Vigente' : 'Sem data final'}</small></td>
                        <td>{contrato.itens.length}</td>
                        <td>{valorContratadoVigencia(contrato.itens) === null ? '—' : moeda(valorContratadoVigencia(contrato.itens))}</td>
                        <td title="Consumo total × preço unitário do contrato">{moeda(contrato.itens.reduce((s, item) => s + item.totalConsumido * (Number(item.vlr_uni_bruto) || 0), 0))}</td>
                        <td><BarraEfetividade itens={contrato.itens} valor={efetividade} /></td>
                    </tr>
                    {aberto && <tr><td colSpan={6} className="demanda-itens-expandidos"><TabelaItens itens={contrato.itens} meses={meses} /></td></tr>}
                </Fragment>;
            })}</tbody>
        </table></div>
    </>;
}

export function ContratosCliente({ codigo }) {
    const [resultado, setResultado] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [tentativa, setTentativa] = useState(0);
    const [vigentes, setVigentes] = useState(true);
    useEffect(() => {
        let ativo = true;
        setCarregando(true); setResultado(null);
        carregarContratosCliente(codigo).then(dados => { if (ativo) setResultado(dados); })
            .finally(() => { if (ativo) setCarregando(false); });
        return () => { ativo = false; };
    }, [codigo, tentativa]);
    const hoje = new Date();
    const meses = mesesRecentes(hoje);
    const todosContratos = montarContratosDemanda(resultado?.contratos || [], resultado?.reservas || [], hoje);
    const contratos = todosContratos
        .map(contrato => ({ ...contrato, itens: contrato.itens.filter(item => !vigentes || !item.vencido) })).filter(contrato => contrato.itens.length);
    const marcas = new Map();
    contratos.forEach(contrato => contrato.itens.forEach(item => {
        const marca = item.cod_completo || 'Não informada';
        if (!marcas.has(marca)) marcas.set(marca, []);
        marcas.get(marca).push(item);
    }));
    const resumo = resultado?.contratos && resultado?.reservas ? resumirContratos(todosContratos.flatMap(contrato => contrato.itens), hoje) : null;
    return <>
        {resumo && !carregando && <dl className="pedido-card demanda-indicadores" aria-label="Resumo dos contratos vigentes">
            {[
                [numero(resumo.contratos), 'Contratos vigentes'],
                [numero(resumo.itens), 'Itens vigentes'],
                [moeda(resumo.contratado), 'Contratado por mês'],
                [moeda(resumo.consumo), 'Consumo médio por mês']
            ].map(([valor, titulo]) => <div key={titulo}><dt>{titulo}</dt><dd>{valor}</dd></div>)}
            <div className="demanda-indicador-efetividade">
                <dt>Efetividade por consumo</dt>
                <dd><BarraEfetividade itens={todosContratos.flatMap(contrato => contrato.itens).filter(item => !item.vencido)} valor={resumo.efetividade} /></dd>
            </div>
            <div className={resumo.parados > 0 ? 'demanda-indicador-alerta' : undefined}>
                <dt>Itens sem consumo há 3+ meses</dt>
                <dd title="Itens vigentes com pelo menos três meses de histórico e sem consumo positivo nos últimos três meses fechados.">{numero(resumo.parados)}</dd>
            </div>
        </dl>}
        <section className="pedido-card" aria-labelledby="demanda-contratos-titulo">
        <h2 className="pedido-title" id="demanda-contratos-titulo">Contratos e consumo</h2>
        <div className="demanda-filtros"><label htmlFor="demanda-vigencia">Contratos:</label>
            <select id="demanda-vigencia" value={vigentes ? 'vigentes' : 'todos'} onChange={event => setVigentes(event.target.value === 'vigentes')}>
                <option value="vigentes">Só vigentes</option><option value="todos">Todos, incluindo vencidos</option>
            </select>
            <button className="btn-recalcular-itens" type="button" disabled={carregando} onClick={() => { invalidarConsultas('demandaContratos|'); setTentativa(valor => valor + 1); }}>Consultar novamente</button>
        </div>
        {carregando ? <p role="status">Carregando contratos e reservas...</p> : <>
            {resultado?.erros.map(erro => <p key={erro} className="demanda-erro" role="alert">{erro}</p>)}
            {resultado?.contratos !== null && resultado?.reservas !== null && <>
                <h3 className="demanda-subtitulo">Contratos — situação 37</h3>
                {!contratos.length ? <p>Nenhum contrato {vigentes ? 'vigente ' : ''}encontrado para este cliente.</p> : <TabelaContratos contratos={contratos} meses={meses} />}
                {!!marcas.size && <><h3 className="demanda-subtitulo">Itens por marca</h3>
                    <TabelaMarcas marcas={marcas} meses={meses} />
                </>}
            </>}
            <p className="demanda-orientacao">* Mês atual, parcial. Média dos últimos três meses fechados, limitada ao início do contrato. Para vencidos sem consumo posterior, considera os últimos meses da vigência. Efetividade = média mensal ÷ quantidade contratada.</p>
            <p className="demanda-orientacao">Dentro: de 90% a 110%. Acima: mais de 110%. Abaixo: menos de 90%. Sem consumo: média zero nos meses considerados. Vigência, preço e consumo vêm do pedido 14; a quantidade contratada vem do 37 vinculado. Sem reserva, utiliza os dados do 37. Consumido (R$) = consumo total × preço unitário. Contratado na vigência = quantidade mensal × meses de vigência × preço unitário.</p>
        </>}
    </section></>;
}
