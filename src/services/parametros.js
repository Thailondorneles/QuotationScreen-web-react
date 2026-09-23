import { unimedApi } from '../config/apis';
import { aplicarParametros } from '../config/parametrosAplicacao';
import { consultarComCache, invalidarConsultas } from './consultaCache';

export function getParametros() {
    return consultarComCache('parametros', () =>
        unimedApi.get('parsConf', { timeout: 10000, params: { _atualizacao: Date.now() } }).then(response => {
            if (!Array.isArray(response.data?.items)) throw new Error('Resposta inválida dos parâmetros.');
            return response;
        }), Infinity);
}

export async function atualizarParametro(id, parametro) {
    const response = await unimedApi.put(`parsConf/${encodeURIComponent(id)}`, { parametro });
    invalidarConsultas('parametros');
    return response;
}

let carregamento;
export function carregarParametrosAplicacao() {
    if (!carregamento) {
        carregamento = getParametros()
            .then(response => aplicarParametros(response.data?.items))
            .catch(() => {
                aplicarParametros([]);
                console.warn('Parâmetros indisponíveis. A aplicação usará os valores padrão até atualizar a página.');
            });
    }
    return carregamento;
}
