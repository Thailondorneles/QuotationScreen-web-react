import { useState } from 'react';
import { useInformacoesCliente } from '../hooks/demandaContratos/useInformacoesCliente';
import { ConsultaPorCliente } from '../components/demandaContratos/ConsultaPorCliente';
import { InformacoesCliente } from '../components/demandaContratos/InformacoesCliente';
import { VisaoGeral } from '../components/demandaContratos/VisaoGeral';
import '../style/pedidoVenda.css';
import '../style/demandaContratos.css';

export function DemandaContratos() {
    const [aba, setAba] = useState('informacoes');
    const consulta = useInformacoesCliente();
    return <main className="pedido-venda-container demanda-contratos">
        <section className="pedido-card demanda-cabecalho" aria-labelledby="demanda-titulo">
            <h1 className="pedido-title" id="demanda-titulo">Demanda contratos</h1>
            <nav className="demanda-abas" aria-label="Áreas de Demanda contratos">
                <span className="demanda-aba-ativa" aria-current="page">Clientes</span>
            </nav>
            <nav className="demanda-subabas" aria-label="Consultas de clientes">
                { [['informacoes', 'Informações de Clientes'], ['consulta', 'Consulta por cliente'], ['geral', 'Visão geral']].map(([id, nome]) => <button key={id} type="button" aria-current={aba === id ? 'page' : undefined} onClick={() => setAba(id)}>{nome}</button>) }
            </nav>
        </section>
        <div className="demanda-conteudo-aba" hidden={aba !== 'informacoes'}><InformacoesCliente consulta={consulta} /></div>
        <div className="demanda-conteudo-aba" hidden={aba !== 'consulta'}><ConsultaPorCliente consulta={consulta} ativa={aba === 'consulta'} /></div>
        <div className="demanda-conteudo-aba" hidden={aba !== 'geral'}><VisaoGeral ativa={aba === 'geral'} onAbrirCliente={cliente => { consulta.consultar(cliente); setAba('consulta'); }} /></div>
    </main>;
}
