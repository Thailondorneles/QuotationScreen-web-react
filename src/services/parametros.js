import { unimedApi } from '../config/apis';
import { aplicarCorAmbiente, aplicarParametros } from '../config/parametrosAplicacao';
import { consultarComCache, invalidarConsultas } from './consultaCache';

export function carregarTemaAmbiente() {
    return consultarComCache('tema-ambiente', async () => {
        const { data } = await unimedApi.get('ambiente', { timeout: 3200 });
        aplicarCorAmbiente(data?.cor);
    });
}

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
            .catch(() => {});
    }
    return carregamento;
}
