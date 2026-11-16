import { InformacoesCliente } from '../components/demandaContratos/InformacoesCliente';
import '../style/pedidoVenda.css';
import '../style/demandaContratos.css';

export function DemandaContratos() {
    return <main className="pedido-venda-container demanda-contratos">
        <section className="pedido-card demanda-cabecalho" aria-labelledby="demanda-titulo">
            <h1 className="pedido-title" id="demanda-titulo">Demanda contratos</h1>
            <nav className="demanda-abas" aria-label="Áreas de Demanda contratos">
                <span className="demanda-aba-ativa" aria-current="page">Clientes</span>
            </nav>
            <nav className="demanda-subabas" aria-label="Consultas de clientes">
                <span aria-current="page">Informações de Clientes</span>
            </nav>
        </section>
        <InformacoesCliente />
    </main>;
}
