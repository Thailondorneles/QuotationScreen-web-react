import { RouterProvider } from 'react-router-dom';
import { routes } from './routes.js';

function App() {

  return (
    <RouterProvider router={routes}/>
    );
}

export default App;