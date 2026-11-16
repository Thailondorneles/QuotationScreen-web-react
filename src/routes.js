import { RootLayout } from "./views/RootLayout";
import { createBrowserRouter } from "react-router-dom";
import { PedidoVenda } from "./views/PedidoVenda";
import { Pedidos } from "./views/Pedidos";
import { MenuPrincipal } from "./views/MenuPrincipal";
import { DemandaContratos } from "./views/DemandaContratos";
import { Configuracoes } from "./views/Configuracoes"

export const routes = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {   
                index: true,
                element: <MenuPrincipal />
            },
            { path: "/pedidos", element: <Pedidos /> },
            { path: "/demanda-contratos", element: <DemandaContratos /> },
            { path: "/pedido", element: <PedidoVenda key="novo" /> },
            { path: "/pedido/:numSeqPedido", element: <PedidoVenda key="salvo" /> },
            {   
                path: "/conf",
                element: <Configuracoes/>
            }
        ]
    }
])
