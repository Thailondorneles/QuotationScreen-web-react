import { TabelaOrdenavel } from './TabelaOrdenavel';
import { useState } from 'react';
import { numeroAcordo, validarItensAcordo } from '../../domain/demandaContratos/acordo';

const moeda = valor => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function ItensAcordo({ selecao, setSelecao, cliente, representantes = [] }) {
    const [mostrarPrecos, setMostrarPrecos] = useState(true);
    const [consultor, setConsultor] = useState(() => ({ nome: cliente?.des_consultor || '', email: cliente?.email_consultor || '', telefone: '',
        representante: representantes.map(rep => rep.des_pessoa).filter(Boolean).join('; ') }));
    const [gerando, setGerando] = useState(false);
    const [erro, setErro] = useState('');
    const itens = Object.values(selecao);
    const total = itens.reduce((s, item) => s + (numeroAcordo(item.quantidade) || 0) * (numeroAcordo(item.preco) || 0), 0);
    const valido = validarItensAcordo(itens);
    const alterar = (codigo, campo, valor) => { setSelecao(atual => ({ ...atual, [codigo]: { ...atual[codigo], [campo]: valor } })); setErro(''); };
    const remover = codigo => setSelecao(atual => { const copia = { ...atual }; delete copia[codigo]; return copia; });
    async function gerar() {
        if (!valido || !consultor.nome.trim() || gerando) return;
        setErro(''); setGerando(true);
        try {
            const { baixarPdfAcordo } = await import('../../services/demandaContratos/acordoPdf');
            baixarPdfAcordo({ cliente, consultor, itens, mostrarPrecos });
        } catch (e) { setErro(e.message || 'Não foi possível gerar o PDF. Tente novamente.'); }
        finally { setGerando(false); }
    }
    if (!itens.length) return <p className="demanda-orientacao">Selecione itens das listas para montar os itens para possível acordo.</p>;
    return <section className="demanda-acordo" aria-labelledby="demanda-acordo-titulo">
        <div className="demanda-acordo-topo"><h4 className="demanda-subtitulo" id="demanda-acordo-titulo">Itens para possível acordo · {itens.length} itens</h4>
            <button type="button" className="btn-recalcular-itens" onClick={() => setSelecao({})}>Limpar seleção</button></div>
        <p className="demanda-orientacao">O preço inicial usa a última venda disponível; sem venda, usa o preço do contrato. Ajuste a marca, a quantidade mensal e o preço antes de baixar o PDF.</p>
        <div className="demanda-acordo-consultor">
            {[[ 'nome', 'Consultor' ], [ 'email', 'E-mail do consultor' ], [ 'telefone', 'Telefone do consultor' ], [ 'representante', 'Representante' ]].map(([campo, titulo]) => <label key={campo}>{titulo}<input value={consultor[campo]} onChange={event => setConsultor(atual => ({ ...atual, [campo]: event.target.value }))} /></label>)}
        </div>
        <div className="demanda-tabela-scroll"><TabelaOrdenavel className="demanda-tabela demanda-acordo-tabela"><thead><tr><th>Código</th><th>Marca</th><th>Descrição</th><th>Origem</th><th>Qtd. mensal</th><th>Vlr. unit.</th><th>Vlr. total</th><th>Ação</th></tr></thead>
            <tbody>{itens.map(item => <tr key={item.codigo}>
                <td>{item.codigo}</td><td><input aria-label={`Marca do item ${item.codigo}`} value={item.marca} onChange={e => alterar(item.codigo, 'marca', e.target.value)} /></td>
                <td>{item.descricao}</td><td>{item.origem}</td>
                <td><input aria-label={`Quantidade mensal do item ${item.codigo}`} inputMode="decimal" value={item.quantidade} onChange={e => alterar(item.codigo, 'quantidade', e.target.value)} /></td>
                <td><input aria-label={`Preço unitário do item ${item.codigo}`} inputMode="decimal" value={item.preco} onChange={e => alterar(item.codigo, 'preco', e.target.value)} /></td>
                <td>{moeda((numeroAcordo(item.quantidade) || 0) * (numeroAcordo(item.preco) || 0))}</td>
                <td><button type="button" className="btn-recalcular-itens" aria-label={`Remover item ${item.codigo}`} onClick={() => remover(item.codigo)}>Remover</button></td>
            </tr>)}</tbody><tfoot><tr><th colSpan={6}>TOTAL MENSAL ESTIMADO</th><td>{moeda(total)}</td><td /></tr></tfoot>
        </TabelaOrdenavel></div>
        {!valido && <p className="demanda-erro" role="alert">Informe quantidades maiores que zero e preços válidos, iguais ou maiores que zero.</p>}
        {!consultor.nome.trim() && <p className="demanda-orientacao">Preencha o nome do consultor para gerar o documento.</p>}
        {erro && <p className="demanda-erro" role="alert">{erro}</p>}
        <div className="demanda-acordo-topo demanda-acordo-acoes"><label><input type="checkbox" checked={mostrarPrecos} onChange={e => setMostrarPrecos(e.target.checked)} /> Mostrar preços no PDF</label>
            <button type="button" className="btn-adicionar" disabled={!valido || !consultor.nome.trim() || gerando} onClick={gerar}>{gerando ? 'Gerando...' : 'Baixar PDF dos itens'}</button></div>
    </section>;
}
