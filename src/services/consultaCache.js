import { unimedApi } from '../config/apis';

const entradas = new Map();
export const CACHE_TTL = 5 * 60 * 1000;

// Compartilha inclusive chamadas em andamento. Falhas nunca ficam no cache.
export function consultarComCache(chave, carregar, ttl = CACHE_TTL) {
    const atual = entradas.get(chave);
    if (atual && (atual.pendente || atual.expiraEm > Date.now())) return atual.promise;
    const entrada = { pendente: true, expiraEm: 0 };
    entrada.promise = Promise.resolve().then(carregar).then(resultado => {
        entrada.pendente = false;
        entrada.expiraEm = Date.now() + ttl;
        return resultado;
    }).catch(error => {
        if (entradas.get(chave) === entrada) entradas.delete(chave);
        throw error;
    });
    entradas.set(chave, entrada);
    return entrada.promise;
}

export function invalidarConsultas(prefixo) {
    for (const chave of entradas.keys()) {
        if (chave.startsWith(prefixo)) entradas.delete(chave);
    }
}

export function getConsultaCached(url, config = {}) {
    const params = Object.entries(config.params || {}).sort(([a], [b]) => a.localeCompare(b));
    return consultarComCache(`consulta|${url}|${JSON.stringify(params)}`, () => unimedApi.get(url, config));
}
