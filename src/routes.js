import { RootLayout } from "./views/RootLayout";
import { createBrowserRouter } from "react-router-dom";
import { PedidoVenda } from "./views/PedidoVenda";
import { Configuracoes } from "./views/Configuracoes"

export const routes = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {   
                path: "/",
                element: <PedidoVenda />
            },
            {   
                path: "/conf",
                element: <Configuracoes/>
            }
        ]
    }
])