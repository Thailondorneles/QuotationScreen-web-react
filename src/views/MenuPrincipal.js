import { FaClipboardList, FaCog, FaFileContract } from 'react-icons/fa';
import '../style/navegacao.css';

export const atalhosMenu = [
    { caminho: '/pedidos', titulo: 'Pedidos', Icone: FaClipboardList },
    { caminho: '/demanda-contratos', titulo: 'Demanda contratos', Icone: FaFileContract },
    { caminho: '/conf', titulo: 'Configurações', Icone: FaCog }
];

export function MenuPrincipal() {
    return <main className="menu-principal">
        <div className="menu-boas-vindas">
            <h1>Bem-vindo!</h1>
            <p>Acesse o menu lateral para acessar outros modulos</p>
        </div>
    </main>;
}
