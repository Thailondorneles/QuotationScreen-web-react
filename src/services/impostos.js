import { unimedApi } from "../config/apis.js";
import { consultarComCache, invalidarConsultas } from './consultaCache';

export function invalidarImpostos() {
    invalidarConsultas('impostos|');
}

export function getImpostos({ codOper, codUnidade, codPessoa, codCondPgto,  codItem}) {
    return unimedApi.get(`impostos/${codOper}/${codUnidade}/${codPessoa}/${codCondPgto}/${codItem}`);
}

export function getImpostosCached(parametros) {
    const { codOper, codUnidade, codPessoa, codCondPgto, codItem } = parametros;
    const chave = [codOper, codUnidade, codPessoa, codCondPgto, codItem]
        .map(valor => String(valor ?? '').trim())
        .join('|');
    return consultarComCache(`impostos|${chave}`, () => getImpostos(parametros));
}
