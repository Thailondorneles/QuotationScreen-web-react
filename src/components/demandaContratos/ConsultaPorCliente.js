import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FaSearch, FaEraser } from 'react-icons/fa';
import { LovClientes } from '../LovClientes';
import { carregarContratosCliente } from '../../services/demandaContratos/contratos';
import { prepararConsulta, filtrarConsulta, resumirConsulta } from '../../domain/demandaContratos/consultaCliente';
import { classificarEfetividade } from '../../domain/demandaContratos/contratos';
import { Efetividade, BarraEfetividade } from './ContratosCliente';
import { TabelaOrdenavel } from './TabelaOrdenavel';
import { baixarBlob } from '../../services/proposta/propostaDownloadService';

const numero = valor => valor == null ? '—' : Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const moeda = valor => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = valor => valor ? String(valor).slice(0, 10).split('-').reverse().join('/') : 'Não informada';
const nomeMes = mes => `${['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][Number(mes.slice(5)) - 1]}/${mes.slice(2, 4)}`;
const categorias = [['', 'Todos'], ['acima', 'Acima'], ['dentro', 'Dentro'], ['abaixo', 'Abaixo'], ['sem-consumo', 'Sem consumo'], ['ajustar', 'Reserva a ajustar'], ['vencidos', 'Vencidos'], ['nao-iniciado', 'Não iniciado'], ['sem-base', 'Sem base']];

export function ConsultaPorCliente({ consulta, ativa }) {
    const [lov, setLov] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');
    const [filtros, setFiltros] = useState({ item: '', pedido: '', unidade: '', status: '' });
    const [exportando, setExportando] = useState(false);
    const [tentativa, setTentativa] = useState(0);
    const tabelaRef = useRef(null);
    const cliente = consulta.informacoes?.cliente || consulta.cliente;
    const codigo = cliente?.cod_pessoa;
    useEffect(() => {
        if (!codigo) {
            setResultado(null); setCarregando(false); setErro('');
            return;
        }
        if (!ativa) return;
        let atual = true;
        setCarregando(true); setErro(''); setResultado(null);
        setFiltros({ item: '', pedido: '', unidade: '', status: '' });
        carregarContratosCliente(codigo).then(resposta => { if (atual) setResultado({ ...resposta, codigo }); })
            .catch(() => { if (atual) setErro('Não foi possível carregar a consulta. Tente novamente.'); })
            .finally(() => { if (atual) setCarregando(false); });
        return () => { atual = false; };
    }, [codigo, ativa, tentativa]);
    const itens = useMemo(() => resultado && codigo != null && resultado.codigo === codigo
        ? prepararConsulta(resultado.contratos || [], resultado.reservas || []) : [], [resultado, codigo]);
    const base = filtrarConsulta(itens, { ...filtros, status: '' });
    const visiveis = filtrarConsulta(base, { status: filtros.status });
    const resumo = resumirConsulta(base);
    const hoje = new Date();
    const meses = Array.from({ length: 7 }, (_, i) => {
        const mes = new Date(hoje.getFullYear(), hoje.getMonth() - 6 + i, 1);
        return `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`;
    });
    const alterar = (nome, valor) => setFiltros(atual => ({ ...atual, [nome]: valor }));
    useLayoutEffect(() => {
        const tabela = tabelaRef.current;
        if (!ativa || !tabela) return;
        const ajustarAltura = () => {
            const altura = tabela.tHead.getBoundingClientRect().height + [...tabela.tBodies[0].rows].slice(0, 10)
                .reduce((total, linha) => total + linha.getBoundingClientRect().height, 0);
            if (altura > 0) tabela.parentElement.style.maxHeight = `${Math.ceil(altura) + 1}px`;
        };
        ajustarAltura();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(ajustarAltura);
        observer.observe(tabela);
        return () => observer.disconnect();
    }, [ativa, visiveis]);
    async function exportar() {
        setExportando(true); setErro('');
        try {
            const { default: ExcelJS } = await import('exceljs');
            const livro = new ExcelJS.Workbook();
            const folha = livro.addWorksheet('Consulta por cliente');
            folha.addRow([cliente.cod_pessoa, cliente.des_pessoa]);
            folha.addRow(['Pedido 14', 'Pedido 37', 'Unidade', 'Código', 'Item', 'Contrat./mês', 'Reserva/mês', 'Reserva sugerida', ...meses.map(nomeMes), 'Total', 'Média 3 meses', 'Efetividade (%)', 'Classificação', 'Projeção vigência', 'Início da vigência', 'Fim da vigência', 'Pr. unit.', 'Consumido (R$)', 'Total contratado (qtd)', 'Reserva a ajustar']);
            visiveis.forEach(item => folha.addRow([item.origem === '14' ? item.num_pedido : null, item.pedido37, item.unidade, item.cod_item, item.des_item, item.quantidadeContratada ?? item.quantidade, item.reservaMensal, item.sugerida, ...meses.map(mes => item.consumos[mes] || 0), item.totalConsumido, item.media, item.efetividade, item.status.nome, item.projecao, data(item.dta_emissao), data(item.dta_carga), Number(item.vlr_uni_bruto) || 0, item.totalConsumido * (Number(item.vlr_uni_bruto) || 0), item.totalContratado, item.ajustar ? 'Sim' : 'Não']));
            folha.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            folha.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF298C13' } };
            folha.columns.forEach((coluna, i) => { coluna.width = i === 4 ? 55 : 20; });
            folha.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: folha.columnCount } };
            folha.views = [{ state: 'frozen', ySplit: 2 }];
            baixarBlob(new Blob([await livro.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Consulta_cliente_${codigo}.xlsx`);
        } catch { setErro('Não foi possível exportar a consulta. Tente novamente.'); }
        finally { setExportando(false); }
    }
    return <>
        <section className="pedido-card">
            <h2 className="pedido-title">Consulta por cliente</h2>
            <form onSubmit={evento => { evento.preventDefault(); consulta.consultar(); setTentativa(valor => valor + 1); }}>
                <div className="form-grid"><label htmlFor="consulta-cliente-codigo">Cliente:</label><div className="field-group full">
                    <input id="consulta-cliente-codigo" className="input-cod" inputMode="numeric" value={consulta.codigo} onChange={evento => consulta.setCodigo(evento.target.value)} />
                    <input className="input-desc" aria-label="Cliente da consulta" value={cliente?.des_pessoa || ''} readOnly />
                    <button type="button" className="demanda-icone" aria-label="Pesquisar cliente da consulta" onClick={() => setLov(true)}><FaSearch className="icon" /></button>
                    <button type="button" className="demanda-icone" aria-label="Limpar cliente da consulta" onClick={consulta.limpar}><FaEraser className="icon" /></button>
                </div></div>
                <div className="demanda-acoes"><button className="btn-adicionar" disabled={consulta.carregando}>{consulta.carregando ? 'Consultando...' : 'Consultar'}</button></div>
            </form>
            {consulta.erro && <p role="alert" className="demanda-erro">{consulta.erro}</p>}
            {(carregando || consulta.carregando) && <p role="status">Carregando informações do cliente...</p>}
            {erro && <p role="alert" className="demanda-erro">{erro}</p>}
            <div className="demanda-consulta-filtros">
                <label>Unidade<select value={filtros.unidade} onChange={e => alterar('unidade', e.target.value)}><option value="">Todas as unidades</option>{[...new Set(itens.map(item => item.unidade).filter(Boolean))].sort().map(unidade => <option key={unidade}>{unidade}</option>)}</select></label>
                <label>Item (código ou descrição)<input value={filtros.item} placeholder="Todos os itens" onChange={e => alterar('item', e.target.value)} /></label>
                <label>Pedido de reserva<select value={filtros.pedido} onChange={e => alterar('pedido', e.target.value)}><option value="">Todos os pedidos</option>{[...new Set(itens.filter(item => item.origem === '14').map(item => String(item.num_pedido)))].sort((a,b) => Number(a)-Number(b)).map(pedido => <option key={pedido}>{pedido}</option>)}</select></label>
                <button type="button" className="btn-recalcular-itens" onClick={() => setFiltros({ item: '', pedido: '', unidade: '', status: '' })}>Limpar filtros</button>
            </div>
            {!codigo && !consulta.carregando && !consulta.erro && <div className="demanda-consulta-vazia"><h3>Escolha um cliente para ver o consumo dos contratos</h3><p>Digite o código no campo acima ou utilize a lupa para pesquisar pelo nome.</p></div>}
        </section>
        {codigo && !carregando && !consulta.carregando && resultado?.codigo === codigo && <section className="pedido-card demanda-consulta-resultados">
            {resultado.erros.map(aviso => <p role="alert" className="demanda-erro" key={aviso}>{aviso}</p>)}
            <div className="demanda-consulta-titulo"><div><h2 className="demanda-cliente-nome"><span>{codigo}</span>{cliente.des_pessoa}</h2><p className="demanda-orientacao">Representante: {consulta.informacoes?.representantes?.map(rep => rep.des_pessoa).join('; ') || 'Não informado'}</p></div><button type="button" className="btn-recalcular-itens" disabled={exportando || !visiveis.length} onClick={exportar}>{exportando ? 'Exportando...' : 'Exportar Excel'}</button></div>
            <dl className="demanda-indicadores">
                <div><dt>Contratos vigentes</dt><dd>{resumo.contratos}</dd></div><div><dt>Itens contratados</dt><dd>{resumo.itens}</dd></div><div><dt>Qtd contratada por mês</dt><dd>{numero(resumo.quantidade)}</dd></div><div><dt>Consumido no período</dt><dd>{moeda(resumo.consumido)}</dd></div><div><dt>Efetividade por consumo</dt><dd><BarraEfetividade itens={base} valor={resumo.efetividade} /></dd></div><div><dt>Próximo vencimento{resumo.dias !== null ? ` · ${resumo.dias} dias` : ''}</dt><dd>{resumo.vencimento ? data(resumo.vencimento) : '—'}</dd></div>
            </dl>
            <div className="demanda-consulta-chips" aria-label="Classificação dos itens">{categorias.map(([chave, nome]) => {
                const quantidade = filtrarConsulta(base, { status: chave }).length;
                return <button key={chave} type="button" aria-pressed={filtros.status === chave} onClick={() => alterar('status', chave)}>{nome} <strong>{quantidade}</strong></button>;
            })}</div>
            <div className="demanda-tabela-acoes"><span>{visiveis.length} item(ns)</span><span>* Mês atual, parcial · Média dos últimos 3 meses fechados</span></div>
            <div className="demanda-tabela-scroll demanda-consulta-rolagem" tabIndex={0} aria-label="Itens da consulta com rolagem"><TabelaOrdenavel ref={tabelaRef} className="demanda-tabela demanda-consulta-tabela">
                <colgroup><col style={{ width: '11%' }} /><col style={{ width: '24%' }} />{Array.from({ length: 3 }, (_, i) => <col key={`base-${i}`} style={{ width: '5%' }} />)}{meses.map(mes => <col key={mes} style={{ width: '3.9%' }} />)}<col style={{ width: '4.5%' }} /><col style={{ width: '5%' }} /><col style={{ width: '7%' }} /><col style={{ width: '6.2%' }} /></colgroup>
                <thead><tr>{['Pedido', 'Item', 'Contrat./mês', 'Reserva/mês', 'Reserva sugerida', ...meses.map((mes, i) => nomeMes(mes) + (i === 6 ? '*' : '')), 'Total', 'Média 3 meses', 'Efetividade', 'Projeção vigência'].map(nome => <th key={nome}>{nome}</th>)}</tr></thead>
                <tbody>{visiveis.map(item => <tr key={item.chave}>
                    <td data-ordem={item.num_pedido}><div className="demanda-consulta-pedido"><strong>{item.num_pedido}</strong><span className="demanda-unidade" title="Unidade do pedido">{item.unidade || '—'}</span><span>{item.origem === '14' ? `· 37: ${item.pedido37 || 'Sem vínculo'}` : '(sit. 37)'}</span></div>{item.origem === '37' && <small>Sem pedido de reserva</small>}<small>{data(item.dta_emissao)} a {data(item.dta_carga)}</small><small className={item.vencido ? 'demanda-vigencia-vencida' : item.diasRestantes !== null && item.diasRestantes <= 60 ? 'demanda-vigencia-alerta' : undefined}>{item.diasRestantes === null ? 'Sem data final' : item.vencido ? `Vencido há ${-item.diasRestantes} dias` : item.diasRestantes <= 60 ? `Vence em ${item.diasRestantes} dias` : 'Vigente'}</small></td>
                    <td>{item.cod_item} {item.des_item}<small>{moeda(item.vlr_uni_bruto)} un.</small></td>
                    <td data-ordem={item.quantidadeContratada ?? item.quantidade}>{numero(item.quantidadeContratada ?? item.quantidade)}{item.quantidadeContratada === null && <small>Base: reserva</small>}</td>
                    <td data-ordem={item.reservaMensal ?? ''}>{numero(item.reservaMensal)}{item.reservaMensal !== null && item.quantidadeContratada !== null && <small>Dif.: {numero(item.reservaMensal - item.quantidadeContratada)}</small>}</td>
                    <td data-ordem={item.sugerida ?? ''} className="demanda-reserva-sugerida">{numero(item.sugerida)}{item.sugerida !== null && item.reservaMensal !== null && <small>Dif.: {numero(item.sugerida - item.reservaMensal)}</small>}</td>
                    {meses.map(mes => {
                        const qtd = item.consumos[mes] || 0;
                        const antes = !item.dta_emissao || mes < item.dta_emissao.slice(0, 7);
                        const depois = item.dta_carga && mes > item.dta_carga.slice(0, 7);
                        const fora = antes || (depois && qtd === 0);
                        const status = classificarEfetividade(qtd, item.quantidade > 0 ? qtd / item.quantidade * 100 : 100);
                        return <td key={mes} data-ordem={fora ? '' : qtd}><span title={depois && qtd > 0 ? 'Consumo com contrato vencido' : fora ? 'Fora da vigência' : status.nome} className={`demanda-mes-consumo demanda-mes-${fora ? 'inativo' : depois && qtd > 0 ? 'fora' : status.chave}`}>{fora ? '·' : numero(qtd)}</span></td>;
                    })}
                    <td data-ordem={item.totalConsumido}><strong>{numero(item.totalConsumido)}</strong></td><td data-ordem={item.media ?? ''}>{numero(item.media)}</td><td data-ordem={item.efetividade ?? ''}><Efetividade media={item.media} valor={item.efetividade} /></td><td data-ordem={item.projecao ?? ''}>{numero(item.projecao)}{item.projecao !== null && <small>de {numero(item.totalContratado)}{item.totalContratado > 0 ? ` (${numero(item.projecao / item.totalContratado * 100)}%)` : ''}</small>}</td>
                </tr>)}</tbody>
            </TabelaOrdenavel></div>
            {!visiveis.length && <p role="status">Nenhum item encontrado para os filtros selecionados.</p>}
            <div className="demanda-consulta-legenda" aria-label="Cores do consumo mensal"><span className="demanda-mes-dentro">Dentro (90% a 110%)</span><span className="demanda-mes-acima">Acima</span><span className="demanda-mes-abaixo">Abaixo</span><span className="demanda-mes-fora">Consumo com contrato vencido</span><span>· Fora da vigência</span></div>
            <p className="demanda-orientacao">Dentro: 90% a 110%. Acima: mais de 110%. Abaixo: menos de 90%. Sem consumo: média zero. Vigência, preço e consumo vêm do pedido 14; quantidade contratada do 37 vinculado. Sem correspondência, a reserva serve de referência. Projeção = média × meses de vigência. Total inclui todo o histórico de consumo recebido.</p>
        </section>}
        <LovClientes isOpen={lov} setLovOpen={setLov} onSelect={selecionado => { setLov(false); consulta.consultar(selecionado); }} />
    </>;
}
