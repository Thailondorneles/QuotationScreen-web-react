import { unimedApi } from '../config/apis';
import { aplicarParametros } from '../config/parametrosAplicacao';

export function getParametros() {
    return unimedApi.get('parsConf', { timeout: 10000, params: { _atualizacao: Date.now() } });
}

export function atualizarParametro(id, parametro) {
    return unimedApi.put(`parsConf/${encodeURIComponent(id)}`, { parametro });
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
