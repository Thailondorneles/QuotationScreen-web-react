import { RouterProvider } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { routes } from './routes.js';
import { carregarParametrosAplicacao, carregarTemaAmbiente } from './services/parametros';
import { ParametrosContext } from './config/ParametrosContext';
import { SessaoAplicacao } from './components/SessaoAplicacao';

async function prepararAplicacao() {
  await carregarTemaAmbiente().catch(() => {});
  await carregarParametrosAplicacao();
}

function abrirMenuPrincipal() {
  return routes.navigate({ pathname: '/', search: window.location.search }, { replace: true });
}

function App() {
  const [temaPronto, setTemaPronto] = useState(false);
  useEffect(() => {
    let ativo = true;
    carregarTemaAmbiente().catch(() => {}).finally(() => {
      if (ativo) setTemaPronto(true);
    });
    return () => { ativo = false; };
  }, []);

  return (
    <>
      {!temaPronto && <p role="status" className="carregando-ambiente">Carregando ambiente…</p>}
      <div style={{ display: temaPronto ? 'contents' : 'none' }}>
        <SessaoAplicacao prepararAplicacao={prepararAplicacao} abrirMenuPrincipal={abrirMenuPrincipal}>
          <ParametrosContext.Provider value={true}>
            <RouterProvider router={routes} />
          </ParametrosContext.Provider>
        </SessaoAplicacao>
      </div>
    </>
  );
}

export default App;
