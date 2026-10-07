import { RouterProvider } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { routes } from './routes.js';
import LoadingOverlay from './components/LoadingOverlay';
import { carregarParametrosAplicacao } from './services/parametros';
import { ParametrosContext } from './config/ParametrosContext';

function App() {
  const [carregandoParametros, setCarregandoParametros] = useState(true);

  useEffect(() => {
    let ativo = true;
    carregarParametrosAplicacao().finally(() => {
      if (ativo) setCarregandoParametros(false);
    });
    return () => { ativo = false; };
  }, []);

  return (
    <>
      <div style={{ display: 'contents' }} inert={carregandoParametros ? '' : undefined} aria-busy={carregandoParametros}>
        <ParametrosContext.Provider value={!carregandoParametros}>
          <RouterProvider router={routes}/>
        </ParametrosContext.Provider>
      </div>
      <LoadingOverlay isOpen={carregandoParametros} />
    </>
    );
}

export default App;
