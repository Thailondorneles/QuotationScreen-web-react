import { useEffect, useState } from 'react';
import { getParametros, atualizarParametro } from '../services/parametros';
import '../style/configuracoes.css';

export function Configuracoes() {
    const [configuracoes, setConfiguracoes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [tentativa, setTentativa] = useState(0);
    const [infoAberta, setInfoAberta] = useState(null);
    const [originais, setOriginais] = useState({});
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState('');
    const [falhaSalvar, setFalhaSalvar] = useState(false);
    const alteradas = configuracoes.filter(config => String(config.parametro ?? '') !== originais[config.seq_conf]);

    function editar(id, valor) {
        setConfiguracoes(atual => atual.map(config => config.seq_conf === id ? { ...config, parametro: valor } : config));
        setMensagem('');
    }

    async function salvar(event) {
        event.preventDefault();
        if (salvando || !alteradas.length) return;
        setSalvando(true);
        setMensagem('');
        const falhas = [];
        let salvas = 0;
        try {
            for (const config of alteradas) {
                try {
                    await atualizarParametro(config.seq_conf, String(config.parametro ?? ''));
                    setOriginais(atual => ({ ...atual, [config.seq_conf]: String(config.parametro ?? '') }));
                    salvas++;
                } catch {
                    falhas.push(config.des_conf);
                }
            }
            setFalhaSalvar(falhas.length > 0);
            setMensagem(falhas.length
                ? `${salvas} configuração(ões) salva(s). Não foi possível salvar: ${falhas.join(', ')}. Tente novamente.`
                : 'Configurações salvas. Atualize a página para aplicar as alterações.');
        } finally {
            setSalvando(false);
        }
    }

    useEffect(() => {
        let ativo = true;
        setCarregando(true);
        setErro('');
        getParametros()
            .then(response => {
                if (!Array.isArray(response.data?.items)) throw new Error('Resposta inválida');
                if (ativo) {
                    setConfiguracoes([...response.data.items].sort((a, b) => Number(a.seq_conf) - Number(b.seq_conf)));
                    setOriginais(Object.fromEntries(response.data.items.map(config => [config.seq_conf, String(config.parametro ?? '')])));
                }
            })
            .catch(() => {
                if (ativo) setErro('Não foi possível carregar as configurações. Tente novamente.');
            })
            .finally(() => { if (ativo) setCarregando(false); });
        return () => { ativo = false; };
    }, [tentativa]);

    return (
        <main className="configuracoes-pagina">
            <h1>Configurações da aplicação</h1>
            <p className="configuracoes-aviso">Edite os parâmetros e salve. As alterações serão aplicadas após atualizar a página.</p>
            {carregando ? <p role="status">Carregando configurações...</p> : erro ? (
                <div role="alert" className="configuracoes-erro">
                    <span>{erro}</span>
                    <button type="button" onClick={() => setTentativa(valor => valor + 1)}>Tentar novamente</button>
                </div>
            ) : (
                <form onSubmit={salvar}>
                <table className="configuracoes-tabela">
                    <caption>{configuracoes.length} configurações cadastradas</caption>
                    <colgroup><col className="configuracoes-numero" /><col className="configuracoes-chave" /><col /><col className="configuracoes-info-col" /></colgroup>
                    <thead><tr><th scope="col">Número</th><th scope="col">Parâmetro</th><th scope="col">Valor</th><th scope="col"><span className="configuracoes-sr">Observação</span></th></tr></thead>
                    <tbody>
                        {configuracoes.map((config, indice) => (
                            <tr key={`${config.seq_conf}-${config.des_conf}`}>
                                <td className="configuracoes-numero">{config.seq_conf}</td>
                                <th scope="row">{config.des_conf}</th>
                                <td>
                                    <div className={config.des_conf.endsWith('_COR_PRINCIPAL') ? 'configuracoes-cor' : undefined}>
                                        {config.des_conf.endsWith('_COR_PRINCIPAL') && <input type="color" className="configuracoes-seletor-cor" aria-label={`Escolher cor de ${config.des_conf}`} disabled={salvando} value={/^#[0-9a-f]{6}$/i.test(config.parametro) ? config.parametro : '#00844a'} onChange={event => editar(config.seq_conf, event.target.value.toUpperCase())} />}
                                        <input className="configuracoes-valor" aria-label={`Valor de ${config.des_conf}`} disabled={salvando} required={config.des_conf.endsWith('_COR_PRINCIPAL')} pattern={config.des_conf.endsWith('_COR_PRINCIPAL') ? '#[0-9a-fA-F]{6}' : undefined} title={config.des_conf.endsWith('_COR_PRINCIPAL') ? 'Informe a cor no formato #RRGGBB' : undefined} value={config.parametro ?? ''} onChange={event => editar(config.seq_conf, event.target.value)} />
                                    </div>
                                </td>
                                <td className="configuracoes-info-col">
                                    <div className="configuracoes-info">
                                        <button type="button" className="configuracoes-info-botao" aria-label={`Observação de ${config.des_conf}`} aria-describedby={`config-info-${indice}`} aria-expanded={infoAberta === indice} onClick={() => setInfoAberta(atual => atual === indice ? null : indice)} onBlur={() => setInfoAberta(null)} onKeyDown={event => { if (event.key === 'Escape') { setInfoAberta(null); event.currentTarget.blur(); } }}>i</button>
                                        <span id={`config-info-${indice}`} role="tooltip" className={`configuracoes-tooltip${infoAberta === indice ? ' aberto' : ''}`}>{config.txt_observacao || 'Sem observação cadastrada.'}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!configuracoes.length && <tr><td colSpan="4">Nenhuma configuração cadastrada.</td></tr>}
                    </tbody>
                </table>
                <div className="configuracoes-rodape">
                    <span>{alteradas.length ? `${alteradas.length} alteração(ões) pendente(s)` : 'Nenhuma alteração pendente'}</span>
                    <button type="submit" className="configuracoes-salvar" disabled={salvando || !alteradas.length}>{salvando ? 'Salvando...' : 'Salvar'}</button>
                </div>
                {mensagem && <p role={falhaSalvar ? 'alert' : 'status'} className={falhaSalvar ? 'configuracoes-erro' : 'configuracoes-sucesso'}>{mensagem}</p>}
                </form>
            )}
        </main>
    );
}
