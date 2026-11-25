import { useState } from 'react';
import { FaSearch, FaEraser } from 'react-icons/fa';
import { LovClientes } from '../LovClientes';
import { getClientesDaCarteira } from '../../services/demandaContratos/carteira';
import { useInformacoesCliente } from '../../hooks/demandaContratos/useInformacoesCliente';
import { ContratosCliente } from './ContratosCliente';

const primeiro = (...valores) => valores.find(valor => valor != null && String(valor).trim() !== '') ?? '';
function documento(valor) {
    const numeros = String(valor ?? '').replace(/\D/g, '');
    return numeros.length === 14 ? numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : valor;
}
function Campo({ titulo, valor }) {
    return <div className="demanda-campo"><dt>{titulo}</dt><dd>{valor || 'Não informado'}</dd></div>;
}

export function InformacoesCliente({ consulta }) {
    return consulta ? <ConteudoInformacoes consulta={consulta} /> : <InformacoesClienteLocal />;
}

function InformacoesClienteLocal() {
    const consulta = useInformacoesCliente();
    return <ConteudoInformacoes consulta={consulta} />;
}

function ConteudoInformacoes({ consulta }) {
    const [buscaAberta, setBuscaAberta] = useState(false);
    const dados = consulta.informacoes?.cliente || consulta.cliente;
    return <>
        <section className="pedido-card" aria-labelledby="demanda-informacoes-titulo">
            <h2 className="pedido-title" id="demanda-informacoes-titulo">Informações de Clientes</h2>
            <form onSubmit={event => { event.preventDefault(); consulta.consultar(); }}>
                <div className="form-grid">
                    <label htmlFor="demanda-cliente-codigo">Cliente:</label>
                    <div className="field-group full">
                        <input id="demanda-cliente-codigo" className="input-cod" value={consulta.codigo} inputMode="numeric" autoComplete="off" onChange={event => consulta.setCodigo(event.target.value)}
                            onBlur={event => {
                                // Os botões já executam a consulta, a pesquisa ou a limpeza.
                                if (event.relatedTarget?.closest('button')) return;
                                if (consulta.codigo.trim() && !consulta.cliente && !consulta.carregando) consulta.consultar();
                            }} />
                        <input className="input-desc" aria-label="Nome do cliente" value={consulta.cliente?.des_pessoa || ''} readOnly />
                        <button className="demanda-icone" type="button" aria-label="Buscar cliente por código ou nome" onClick={() => setBuscaAberta(true)}><FaSearch className="icon" /></button>
                        <button className="demanda-icone" type="button" aria-label="Limpar cliente" onClick={consulta.limpar}><FaEraser className="icon" /></button>
                    </div>
                </div>
                <div className="demanda-acoes"><button className="btn-adicionar" type="submit" disabled={consulta.carregando}>{consulta.carregando ? 'Consultando...' : 'Consultar'}</button></div>
            </form>
            {consulta.erro && <p className="demanda-erro" role="alert">{consulta.erro}</p>}
            {consulta.carregando && <p role="status">Carregando informações do cliente...</p>}
            {!consulta.cliente && !consulta.carregando && !consulta.erro && <p className="demanda-orientacao">Informe o código do cliente ou utilize a lupa para pesquisar pelo nome.</p>}
        </section>
        {dados && !consulta.carregando && <>
            {!!consulta.informacoes?.avisos.length && <div className="pedido-card demanda-avisos" role="alert">
                {consulta.informacoes.avisos.map(aviso => <p key={aviso}>{aviso}</p>)}
                <button type="button" className="btn-recalcular-itens" onClick={() => consulta.consultar(consulta.cliente)}>Tentar novamente</button>
            </div>}
            <section className="pedido-card demanda-perfil"><h2 className="demanda-cliente-nome"><span>{dados.cod_pessoa}</span>{dados.des_pessoa}</h2><div className="demanda-perfil-grid"><section aria-labelledby="demanda-cadastro-titulo">
                <h2 className="pedido-title" id="demanda-cadastro-titulo">Cadastro do cliente</h2>
                <dl className="demanda-dados">
                    
                    
                    <Campo titulo="Nome fantasia" valor={dados.des_fantasia} />
                    <Campo titulo="CNPJ / CPF" valor={documento(primeiro(dados.cnpj, dados.num_cnpj_cpf))} />
                    <Campo titulo="Cidade" valor={dados.des_cidade} />
                    <Campo titulo="UF" valor={dados.cod_uf} />
                </dl>
            </section>
            <section aria-labelledby="demanda-atendimento-titulo">
                <h2 className="pedido-title" id="demanda-atendimento-titulo">Atendimento</h2>
                <dl className="demanda-dados">
                    <Campo titulo="Representante(s)" valor={consulta.informacoes?.representantes.map(rep => [rep.cod_pessoa_rep, rep.des_pessoa].filter(Boolean).join(' — ')).join('; ')} />
                    <Campo titulo="Consultor" valor={dados.des_consultor} />
                </dl>
            </section>
            <section aria-labelledby="demanda-contatos-titulo">
                <h2 className="pedido-title" id="demanda-contatos-titulo">Contatos do cliente</h2>
                <dl className="demanda-dados">
                    <Campo titulo="Contato" valor={dados.des_contato} />
                    <Campo titulo="E-mail" valor={primeiro(dados.email, dados.des_email)} />
                    <Campo titulo="Telefone" valor={primeiro(dados.telefone, dados.num_fone)} />
                </dl>
            </section>
            </div></section>
            <ContratosCliente key={dados.cod_pessoa} codigo={dados.cod_pessoa} cliente={dados} representantes={consulta.informacoes?.representantes || []} />
        </>}
        <LovClientes carregarClientes={getClientesDaCarteira} isOpen={buscaAberta} setLovOpen={setBuscaAberta} onSelect={cliente => { setBuscaAberta(false); consulta.consultar(cliente); }} />
    </>;
}
