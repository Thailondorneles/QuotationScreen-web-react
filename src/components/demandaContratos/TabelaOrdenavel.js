import { Children, cloneElement, forwardRef, Fragment, isValidElement, useState } from 'react';

function texto(elemento) {
    if (elemento == null || typeof elemento === 'boolean') return '';
    if (typeof elemento === 'string' || typeof elemento === 'number') return String(elemento);
    if (Array.isArray(elemento)) return elemento.map(texto).join('');
    if (!isValidElement(elemento) || elemento.type === 'small' || elemento.props['aria-hidden']) return '';
    if (elemento.props['data-ordem'] !== undefined) return String(elemento.props['data-ordem']);
    if (elemento.props.valor !== undefined) return String(elemento.props.valor ?? '');
    if (elemento.type === 'input') return String(elemento.props.value ?? '');
    return texto(elemento.props.children);
}

function valorComparavel(celula) {
    const valor = texto(celula).trim();
    if (!valor || valor === '—' || valor === 'Nunca') return null;
    const data = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (data) return `${data[3]}-${data[2]}-${data[1]}`;
    const mes = valor.match(/^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/(\d{2})$/);
    if (mes) return `${mes[2]}-${String(['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].indexOf(mes[1]) + 1).padStart(2, '0')}`;
    const numero = valor.replace(/^R\$\s*/, '').match(/^(-?[\d.,]+)(?:%| de \d+)?$/);
    if (numero) {
        const numeroTexto = numero[1];
        // Texto monetário/formatado usa pt-BR; valores brutos usam ponto decimal.
        const bruto = celula?.props?.['data-ordem'] !== undefined || typeof celula?.props?.children === 'number'
            || celula?.props?.children?.props?.valor !== undefined || celula?.props?.children?.type === 'input';
        const convertido = Number(bruto && !numeroTexto.includes(',') ? numeroTexto : numeroTexto.replace(/\./g, '').replace(',', '.'));
        if (Number.isFinite(convertido)) return convertido;
    }
    return valor;
}

function primeiraLinha(elemento) {
    if (!isValidElement(elemento)) return null;
    if (elemento.type === 'tr') return elemento;
    if (elemento.type === Fragment) return Children.toArray(elemento.props.children).map(primeiraLinha).find(Boolean);
    return null;
}

export const TabelaOrdenavel = forwardRef(function TabelaOrdenavel({ children, ordemInicial, ...props }, ref) {
    const [ordem, setOrdem] = useState(ordemInicial || null);
    const partes = Children.toArray(children);
    const cabecalho = partes.find(parte => parte.type === 'thead');
    const linhaCabecalho = Children.toArray(cabecalho?.props.children)[0];
    const colunas = Children.toArray(linhaCabecalho?.props.children);
    const indice = ordem ? colunas.findIndex(coluna => texto(coluna) === ordem.coluna) : -1;
    const conteudo = partes.map(parte => {
        if (parte.type === 'thead') return cloneElement(parte, {}, cloneElement(linhaCabecalho, {}, colunas.map(coluna => {
            const titulo = texto(coluna);
            if (['Selecionar', 'Ação'].includes(titulo)) return coluna;
            const ativa = ordem?.coluna === titulo;
            return cloneElement(coluna, { 'aria-sort': ativa ? ordem.direcao === 'asc' ? 'ascending' : 'descending' : 'none' },
                <button type="button" className="demanda-ordenar" onClick={() => setOrdem(atual => ({ coluna: titulo,
                    direcao: atual?.coluna === titulo && atual.direcao === 'asc' ? 'desc' : 'asc' }))}>
                    {coluna.props.children}<span aria-hidden="true">{ativa ? ordem.direcao === 'asc' ? ' ▲' : ' ▼' : ' ↕'}</span>
                </button>);
        })));
        if (parte.type !== 'tbody' || indice < 0) return parte;
        const grupos = Children.toArray(parte.props.children).map((grupo, posicao) => ({ grupo, posicao,
            valor: valorComparavel(Children.toArray(primeiraLinha(grupo)?.props.children)[indice]) }));
        grupos.sort((a, b) => {
            if (a.valor === null) return b.valor === null ? a.posicao - b.posicao : 1;
            if (b.valor === null) return -1;
            const comparacao = typeof a.valor === 'number' && typeof b.valor === 'number' ? a.valor - b.valor
                : String(a.valor).localeCompare(String(b.valor), 'pt-BR', { numeric: true, sensitivity: 'base' });
            return (ordem.direcao === 'asc' ? comparacao : -comparacao) || a.posicao - b.posicao;
        });
        return cloneElement(parte, {}, grupos.map(item => item.grupo));
    });
    return <table {...props} ref={ref}>{conteudo}</table>;
});
