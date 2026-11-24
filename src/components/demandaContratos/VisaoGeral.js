import { useEffect, useMemo, useState } from 'react';
import { carregarVisaoGeral } from '../../services/demandaContratos/contratos';
import { invalidarConsultas } from '../../services/consultaCache';
import { montarVisaoGeral } from '../../domain/demandaContratos/visaoGeral';
import { BarraEfetividade } from './ContratosCliente';
import { TabelaOrdenavel } from './TabelaOrdenavel';
import { baixarBlob } from '../../services/proposta/propostaDownloadService';

const numero = valor => valor == null ? '—' : Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const moeda = valor => valor == null ? '—' : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = valor => valor ? valor.split('-').reverse().join('/') : '—';
const colunas = ['Código', 'Cliente', 'Representante', 'Contratos vigentes', 'Contratos vencidos', 'Itens', 'Contratado (R$)', 'Consumido (R$)', 'Efetividade', 'Acima', 'Abaixo', 'Sem consumo', 'Reservas a ajustar', 'Próx. vencimento'];

function ValorContratado({ resumo }) {
    return <>{moeda(resumo.contratado)}{resumo.semVigencia > 0 && <small className="demanda-valor-parcial" title="Itens sem vigência válida não entram nesta soma. Nenhuma data foi estimada.">{resumo.contratado === null ? 'Não calculável' : 'Parcial'} · {resumo.semVigencia} item(ns) sem vigência válida</small>}</>;
}

export function VisaoGeral({ ativa, onAbrirCliente }) {
    const [resultado, setResultado] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');
    const [revisao, setRevisao] = useState(0);
    const [exportando, setExportando] = useState(false);
    const [filtros, setFiltros] = useState({ unidade: '', busca: '', contratos: 'vigentes' });
    useEffect(() => {
        if (!ativa) return;
        let atual = true;
        setCarregando(true); setErro('');
        carregarVisaoGeral().then(dados => { if (atual) setResultado(dados); })
            .catch(() => { if (atual) { setResultado(null); setErro('Não foi possível carregar a visão geral. Tente novamente.'); } })
            .finally(() => { if (atual) setCarregando(false); });
        return () => { atual = false; };
    }, [ativa, revisao]);
    const visao = useMemo(() => montarVisaoGeral(resultado?.contratos || [], resultado?.reservas || [], filtros), [resultado, filtros]);
    const { resumo, linhas, unidades, itens } = visao;
    const alterar = (campo, valor) => setFiltros(atual => ({ ...atual, [campo]: valor }));
    function atualizar() { invalidarConsultas('demandaContratos|'); setRevisao(valor => valor + 1); }
    async function exportar() {
        setExportando(true); setErro('');
        try {
            const { default: ExcelJS } = await import('exceljs');
            const livro = new ExcelJS.Workbook();
            const folha = livro.addWorksheet('Visão geral');
            folha.addRow([...colunas, 'Itens sem vigência válida', 'Valor contratado parcial']);
            linhas.forEach(linha => folha.addRow([linha.codigo, linha.nome, linha.representante, linha.vigentes, linha.vencidos, linha.quantidadeItens, linha.contratado, linha.consumido, linha.efetividade, linha.acima, linha.abaixo, linha.semConsumo, linha.ajustar, data(linha.vencimento), linha.semVigencia, linha.semVigencia ? 'Sim' : 'Não']));
            folha.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            folha.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
            folha.columns.forEach((coluna, i) => { coluna.width = i === 1 ? 60 : i === 2 ? 35 : 22; });
            [7, 8].forEach(coluna => { folha.getColumn(coluna).numFmt = '"R$" #,##0.00'; });
            folha.getColumn(9).numFmt = '0.00"%"';
            folha.views = [{ state: 'frozen', ySplit: 1 }];
            folha.autoFilter = { from: 'A1', to: 'P1' };
            baixarBlob(new Blob([await livro.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Visao_geral_contratos.xlsx');
        } catch { setErro('Não foi possível exportar a visão geral. Tente novamente.'); }
        finally { setExportando(false); }
    }
    return <section className="pedido-card demanda-visao-geral">
        <h2 className="pedido-title">Visão geral</h2>
        <div className="demanda-consulta-filtros">
            <label>Unidade<select value={filtros.unidade} onChange={evento => alterar('unidade', evento.target.value)}><option value="">Todas as unidades</option>{unidades.map(unidade => <option key={unidade}>{unidade}</option>)}</select></label>
            <label>Buscar cliente<input placeholder="Código ou nome" value={filtros.busca} onChange={evento => alterar('busca', evento.target.value)} /></label>
            <label>Contratos<select value={filtros.contratos} onChange={evento => alterar('contratos', evento.target.value)}><option value="vigentes">Só vigentes</option><option value="todos">Todos</option></select></label>
            <button type="button" className="btn-recalcular-itens" disabled={carregando} onClick={atualizar}>Atualizar</button>
            <button type="button" className="btn-recalcular-itens" disabled={carregando || exportando || !linhas.length} onClick={exportar}>{exportando ? 'Exportando...' : 'Exportar Excel'}</button>
        </div>
        <h3>Todos os clientes</h3>
        <p className="demanda-orientacao">Efetividade = consumo médio mensal ÷ quantidade contratada por mês. Clique em um cliente para abrir a consulta.</p>
        {carregando && <p role="status">Carregando contratos de todos os clientes...</p>}
        {erro && <p className="demanda-erro" role="alert">{erro}</p>}
        {resultado?.erros.map(aviso => <p className="demanda-erro" role="alert" key={aviso}>{aviso}</p>)}
        {!carregando && resultado && <>
            <dl className="demanda-indicadores demanda-geral-indicadores">
                <div><dt>Clientes</dt><dd>{numero(resumo.clientes)}</dd></div><div><dt>Contratos vigentes</dt><dd>{numero(resumo.vigentes)}</dd></div><div className="demanda-indicador-vencidos"><dt>Contratos vencidos</dt><dd>{numero(resumo.vencidos)}</dd></div><div><dt>Itens</dt><dd>{numero(resumo.itens)}</dd></div><div><dt>Valor contratado na vigência</dt><dd><ValorContratado resumo={resumo} /></dd></div><div><dt>Consumido</dt><dd>{moeda(resumo.consumido)}</dd></div><div><dt>Efetividade geral</dt><dd><BarraEfetividade itens={itens} valor={resumo.efetividade} /></dd></div>
            </dl>
            <div className="demanda-tabela-scroll demanda-geral-rolagem" tabIndex={0} aria-label="Clientes com rolagem vertical"><TabelaOrdenavel className="demanda-tabela demanda-geral-tabela" ordemInicial={{ coluna: 'Consumido (R$)', direcao: 'desc' }}>
                <colgroup>{[4, 23, 14, 5, 5, 3, 8, 8, 7, 3, 3, 4, 5, 8].map((largura, i) => <col key={i} style={{ width: `${largura}%` }} />)}</colgroup>
                <thead><tr>{colunas.map(coluna => <th key={coluna}>{coluna}</th>)}</tr></thead>
                <tbody>{linhas.map(linha => <tr key={linha.codigo} onClick={() => onAbrirCliente({ cod_pessoa: linha.codigo, des_pessoa: linha.nome })}>
                    <td data-ordem={Number(linha.codigo)}>{linha.codigo}</td><td><button type="button" className="demanda-geral-cliente">{linha.nome}</button></td><td>{linha.representante}</td>
                    <td>{linha.vigentes}</td><td className={linha.vencidos ? 'demanda-geral-vencido' : undefined}>{linha.vencidos}</td><td>{linha.quantidadeItens}</td><td data-ordem={linha.contratado ?? ''}><ValorContratado resumo={linha} /></td><td data-ordem={linha.consumido}>{moeda(linha.consumido)}</td><td data-ordem={linha.efetividade ?? ''}><BarraEfetividade itens={linha.itens} valor={linha.efetividade} /></td><td>{linha.acima}</td><td>{linha.abaixo}</td><td>{linha.semConsumo}</td><td>{linha.ajustar}</td><td data-ordem={linha.vencimento || ''}>{data(linha.vencimento)}{linha.dias !== null && <small>{linha.dias} dias</small>}</td>
                </tr>)}</tbody>
            </TabelaOrdenavel></div>
            {!linhas.length && <p role="status">Nenhum cliente encontrado para os filtros selecionados.</p>}
            <p className="demanda-orientacao">Contratado na vigência = quantidade mensal × meses de vigência × preço. Consumido = quantidade total consumida × preço. Contratos vigentes e vencidos incluem o histórico da carteira filtrada por cliente e unidade; itens, valores e efetividade respeitam também a opção “Só vigentes”.</p>
        </>}
    </section>;
}
