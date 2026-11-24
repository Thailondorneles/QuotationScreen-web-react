import logo from '../imagens/nl-logo.png';
import { parametros } from '../config/parametrosAplicacao';
import { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaHome, FaSignOutAlt } from 'react-icons/fa';
import { atalhosMenu } from '../views/MenuPrincipal';
import { ParametrosContext } from '../config/ParametrosContext';
import { sair } from '../services/sessao';
import '../style/menuStyle.css';

export function Header() {
  useContext(ParametrosContext);
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState('');
  const location = useLocation();
  const botaoRef = useRef(null);
  const painelRef = useRef(null);
  useEffect(() => { setAberto(false); }, [location]);
  useEffect(() => {
    if (!aberto) return;
    painelRef.current?.querySelector('button')?.focus();
    const fechar = event => {
      if (event.key === 'Escape') { setAberto(false); botaoRef.current?.focus(); }
      if (event.key === 'Tab') {
        const elementos = painelRef.current.querySelectorAll('button, a');
        const primeiro = elementos[0];
        const ultimo = elementos[elementos.length - 1];
        if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
        else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
      }
    };
    document.addEventListener('keydown', fechar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fechar); document.body.style.overflow = overflowAnterior; };
  }, [aberto]);

  async function encerrarSessao() {
    setSaindo(true);
    setErroSaida('');
    try {
      await sair();
    } catch {
      setErroSaida('Não foi possível sair. Tente novamente.');
      setSaindo(false);
    }
  }

  return (
    <>
    <header className={"header"}>
      <button ref={botaoRef} type="button" className="menu-abrir" aria-label="Abrir menu" aria-expanded={aberto} aria-controls="menu-lateral" onClick={() => setAberto(true)}><FaBars /></button>
      <img src={parametros.AMBIENTE_LOGO || logo} onError={event => { if (event.currentTarget.getAttribute('src') !== logo) event.currentTarget.src = logo; }} alt="logo" className={"logo"} onClick={() => { window.open("http://nl.unimedcentralrs.com.br:8585/NLWeb/site/9000/1", "_blank"); }} />
    </header>
    {aberto && <div className="menu-camada" onClick={() => { setAberto(false); botaoRef.current?.focus(); }}>
      <aside id="menu-lateral" ref={painelRef} className="menu-lateral" role="dialog" aria-modal="true" aria-label="Menu de navegação" onClick={event => event.stopPropagation()}>
        <div className="menu-lateral-topo"><strong>Menu</strong><button type="button" aria-label="Fechar menu" onClick={() => { setAberto(false); botaoRef.current?.focus(); }}><FaTimes /></button></div>
        <nav aria-label="Acesso rápido">
          <NavLink to={{ pathname: '/', search: location.search }} end onClick={() => setAberto(false)}><FaHome />Menu principal</NavLink>
          {atalhosMenu.map(({ caminho, titulo, Icone }) => <NavLink key={caminho} to={{ pathname: caminho, search: location.search }} end onClick={() => setAberto(false)}><Icone />{titulo}</NavLink>)}
          <a href="http://nl.unimedcentralrs.com.br:8585/NLWeb/invoker" target="_blank" rel="noopener noreferrer"><FaSignOutAlt />Retornar ao NL</a>
          <button type="button" onClick={encerrarSessao} disabled={saindo}>
            <FaSignOutAlt />{saindo ? 'Saindo…' : 'Sair do sistema'}
          </button>
          {erroSaida && <p className="menu-erro" role="alert">{erroSaida}</p>}
        </nav>
      </aside>
    </div>}
    </>
  );
}
