import logo from '../imagens/nl-logo.png';
import { parametros } from '../config/parametrosAplicacao';
import '../style/menuStyle.css';

export function Header() {
  return (
    <header className={"header"}>
      <img src={parametros.AMBIENTE_LOGO || logo} onError={event => { if (event.currentTarget.getAttribute('src') !== logo) event.currentTarget.src = logo; }} alt="logo" className={"logo"} onClick={() => { window.open("http://nl.unimedcentralrs.com.br:8585/NLWeb/site/9000/1", "_blank"); }} />
    </header>
  );
}
