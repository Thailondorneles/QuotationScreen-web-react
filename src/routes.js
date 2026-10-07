import { RootLayout } from "./views/RootLayout";
import { createBrowserRouter } from "react-router-dom";
import { PedidoVenda } from "./views/PedidoVenda";
import { Pedidos } from "./views/Pedidos";
import { Configuracoes } from "./views/Configuracoes"

export const routes = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {   
                path: "/",
                element: <Pedidos />
            },
            { path: "/pedido", element: <PedidoVenda key="novo" /> },
            { path: "/pedido/:numSeqPedido", element: <PedidoVenda key="salvo" /> },
            {   
                path: "/conf",
                element: <Configuracoes/>
            }
        ]
    }
])
