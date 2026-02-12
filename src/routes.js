import { RootLayout } from "./views/RootLayout";
import { createBrowserRouter } from "react-router-dom";
import { PedidoVenda } from "./views/PedidoVenda";

export const routes = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {   
                path: "/",
                element: <PedidoVenda />
            }
        ]
    }
])