import { unimedApi } from "../config/apis.js";

const IMPOSTOS_CACHE_TTL = 5 * 60 * 1000;
const impostosCache = new Map();

export function getImpostos({ codOper, codUnidade, codPessoa, codCondPgto,  codItem}) {
    return unimedApi.get(`impostos/${codOper}/${codUnidade}/${codPessoa}/${codCondPgto}/${codItem}`);
}

export function getImpostosCached(parametros) {
    const { codOper, codUnidade, codPessoa, codCondPgto, codItem } = parametros;
    const chave = [codOper, codUnidade, codPessoa, codCondPgto, codItem]
        .map(valor => String(valor ?? '').trim())
        .join('|');
    const cached = impostosCache.get(chave);

    if (cached?.expiraEm > Date.now()) {
        return cached.promise;
    }

    const promise = getImpostos(parametros)
        .catch(error => {
            impostosCache.delete(chave);
            throw error;
        });

    impostosCache.set(chave, {
        promise,
        expiraEm: Date.now() + IMPOSTOS_CACHE_TTL
    });

    return promise;
}
