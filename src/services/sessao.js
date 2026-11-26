import axios from 'axios';

const apiSessao = axios.create({ baseURL: '/api/auth/', timeout: 10000 });
export const CANAL_SESSAO = 'quotation-screen:sessao';

export async function consultarSessao(signal) {
    const { data } = await apiSessao.get('sessao', { signal });
    const codigo = data?.usuario?.codigoPessoa;
    if (!Number.isSafeInteger(codigo) || codigo <= 0 ||
        !Number.isSafeInteger(data?.validadeMs) || data.validadeMs <= 0) {
        throw new Error('Resposta inválida na consulta da sessão.');
    }
    return data;
}

function avisarOutrasAbas() {
    if (typeof BroadcastChannel === 'function') {
        const canal = new BroadcastChannel(CANAL_SESSAO);
        canal.postMessage('sessao-alterada');
        canal.close();
    }
}

export async function entrar(usuario, senha) {
    const { status } = await apiSessao.post('login', { usuario, senha }, { timeout: 18000 });
    if (status !== 204) throw new Error('Resposta inválida no login.');
}

export async function sair() {
    const { status } = await apiSessao.post('logout');
    if (status !== 204) throw new Error('Resposta inválida no logout.');
    avisarOutrasAbas();
    window.location.reload();
}
