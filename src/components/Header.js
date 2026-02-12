import logo from '../imagens/nl-logo.png';
import '../style/menuStyle.css';

export function Header() {
  return (
    <header className={"header"}>
      <img src={logo} alt="logo" className={"logo"} onClick={() => { window.open("http://nl.unimedcentralrs.com.br:8585/NLWeb/site/9000/1", "_blank"); }} />
    </header>
  );
}