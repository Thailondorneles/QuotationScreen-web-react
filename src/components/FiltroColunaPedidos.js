import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function CampoDataBR({ valor, titulo, onChange }) {
    const [texto, setTexto] = useState(() => valor ? valor.split('-').reverse().join('/') : '');
    const [invalido, setInvalido] = useState(false);
    useEffect(() => {
        setTexto(valor ? valor.split('-').reverse().join('/') : '');
        setInvalido(false);
    }, [valor]);
    return <>
        <div className="pedidos-data-campo">
        <input type="text" inputMode="numeric" placeholder="DD/MM/AAAA" aria-label={titulo}
            aria-invalid={invalido} maxLength={10} value={texto}
            onChange={event => {
                const numeros = event.target.value.replace(/\D/g, '').slice(0, 8);
                const formatado = numeros.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
                setTexto(formatado);
                setInvalido(false);
                if (!numeros) { onChange(''); return; }
                if (numeros.length === 8) {
                    const dia = numeros.slice(0, 2);
                    const mes = numeros.slice(2, 4);
                    const ano = numeros.slice(4);
                    const iso = `${ano}-${mes}-${dia}`;
                    const data = new Date(`${iso}T00:00:00Z`);
                    if (Number(ano) > 0 && !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === iso) onChange(iso);
                    else setInvalido(true);
                }
            }}
            onBlur={() => setInvalido(!!texto && (texto.length !== 10 || texto !== (valor ? valor.split('-').reverse().join('/') : '')))} />
        <input type="date" className="pedidos-data-calendario" aria-label={`Abrir calendário: ${titulo}`}
            value={valor || ''} onClick={event => {
                if (typeof event.currentTarget.showPicker === 'function') event.currentTarget.showPicker();
            }} onChange={event => {
                const data = event.target.value;
                setTexto(data ? data.split('-').reverse().join('/') : '');
                setInvalido(false);
                onChange(data);
            }} />
        </div>
        {invalido && <span role="alert">Informe uma data válida em DD/MM/AAAA.</span>}
    </>;
}

export default function FiltroColunaPedidos({ titulo, filtro, valores, onChange, intervaloData = false }) {
    const filtroAtivo = intervaloData ? !!(filtro?.de || filtro?.ate) : !!filtro;
    const [posicao, setPosicao] = useState(null);
    const botaoRef = useRef(null);
    const painelRef = useRef(null);
    useEffect(() => {
        if (!posicao) return;
        painelRef.current?.querySelector('input')?.focus();
        const fechar = event => {
            if (!painelRef.current?.contains(event.target) && !botaoRef.current?.contains(event.target)) setPosicao(null);
        };
        const teclado = event => {
            if (event.key === 'Escape') {
                setPosicao(null);
                botaoRef.current?.focus();
            }
        };
        const reposicionar = event => {
            if (!painelRef.current?.contains(event.target)) setPosicao(null);
        };
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
    }, [posicao]);
    return <>
        <button type="button" ref={botaoRef} className={`pedidos-filtro-cabecalho${filtroAtivo ? ' ativo' : ''}`}
            aria-label={`Filtrar ${titulo}`} aria-haspopup="dialog" aria-expanded={!!posicao}
            onClick={() => {
                const rect = botaoRef.current.getBoundingClientRect();
                setPosicao(posicao ? null : {
                    left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
                    top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 320))
                });
            }}>
            {titulo} <span aria-hidden="true">{filtroAtivo ? '●' : '▾'}</span>
        </button>
        {posicao && createPortal(<div ref={painelRef} className="pedidos-filtro-painel" style={posicao}
            role="dialog" aria-label={`Filtro de ${titulo}`}>
            {intervaloData ? <>
                <label>De
                    <CampoDataBR titulo={`Data inicial de ${titulo}`} valor={filtro?.de || ''}
                        onChange={valor => onChange({ ...filtro, de: valor })} />
                </label>
                <label>Até
                    <CampoDataBR titulo={`Data final de ${titulo}`} valor={filtro?.ate || ''}
                        onChange={valor => onChange({ ...filtro, ate: valor })} />
                </label>
                {filtro?.de && filtro?.ate && filtro.de > filtro.ate && <p role="alert">A data inicial deve ser anterior ou igual à data final.</p>}
            </> : <input aria-label={`Filtrar ${titulo}`} placeholder="Filtrar..." value={filtro}
                onChange={event => onChange(event.target.value)} />}
            <button type="button" className="pedidos-filtro-limpar" onClick={() => onChange(intervaloData ? {} : '')}>Limpar filtro</button>
            {!intervaloData && <div className="pedidos-filtro-valores">
                {valores.map(valor => <button type="button" key={valor} onClick={() => {
                    onChange(valor);
                    setPosicao(null);
                    botaoRef.current?.focus();
                }}>{valor}</button>)}
                {!valores.length && <p>Nenhum valor encontrado.</p>}
            </div>}
        </div>, document.body)}
    </>;
}
