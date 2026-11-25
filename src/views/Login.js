import { useState } from 'react';
import logoUnimed from '../imagens/nlprod2023.png';
import { entrar } from '../services/sessao';
import '../style/login.css';

export function Login({ carregando, erroSessao, onLoginConfirmado, onVerificarSessao }) {
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');

    async function enviar(event) {
        event.preventDefault();
        if (carregando || enviando) return;
        const formulario = event.currentTarget;
        const dados = new FormData(formulario);
        const usuario = dados.get('usuario').trim();
        if (!usuario) {
            setErro('Informe seu usuário do NL.');
            return;
        }

        setEnviando(true);
        setErro('');
        try {
            await entrar(usuario, dados.get('senha'));
            await onLoginConfirmado();
        } catch (error) {
            const status = error.response?.status;
            if (status === 401) setErro('Usuário ou senha inválidos, ou acesso não autorizado.');
            else if (status === 429) setErro('Muitas tentativas. Aguarde antes de tentar novamente.');
            else if (error.response?.data?.codigo === 'AUTH_REVOGACAO_INDISPONIVEL') {
                setErro('O NL não conseguiu encerrar a sessão anterior. Fale com o suporte.');
            }
            else setErro('Não foi possível acessar o NL agora. Tente novamente.');
        } finally {
            formulario.elements.senha.value = '';
            setEnviando(false);
        }
    }

    return (
        <main className="login">
            <img className="login-logo" src={logoUnimed} alt="Unimed Central de Serviços - RS" />
            <section className="login-painel" aria-labelledby="login-titulo">
                <h1 id="login-titulo">Bem-vindo!</h1>
                <p className="login-introducao">Acesse com seu usuário e senha do NL.</p>
                <form onSubmit={enviar} method="post" aria-busy={Boolean(carregando || enviando)}>
                    <fieldset disabled={carregando || enviando}>
                        <label htmlFor="login-usuario">Usuário</label>
                        <input id="login-usuario" name="usuario" autoComplete="username" required />
                        <label htmlFor="login-senha">Senha</label>
                        <input id="login-senha" name="senha" type="password" autoComplete="current-password" required />
                        <button className="login-entrar" type="submit">
                            {carregando || enviando ? 'Entrando…' : 'Entrar'}
                        </button>
                    </fieldset>
                    {(erro || erroSessao) && <p className="login-erro" role="alert">{erro || erroSessao}</p>}
                </form>
                {erroSessao && <button type="button" className="login-verificar" onClick={onVerificarSessao}>
                    Verificar sessão novamente
                </button>}
                <details className="login-ajuda">
                    <summary>Precisa de ajuda com a senha?</summary>
                    <p>Para alterar ou recuperar sua senha, use o NL ou fale com o suporte.</p>
                </details>
            </section>
        </main>
    );
}
