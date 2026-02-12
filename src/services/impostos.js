import { unimedApi } from "../config/apis.js";

export function getImpostos({ codOper, codUnidade, codPessoa, codCondPgto,  codItem}) {
    return unimedApi.get(`impostos/${codOper}/${codUnidade}/${codPessoa}/${codCondPgto}/${codItem}`);
}
