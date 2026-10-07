import { getConsultaCached } from './consultaCache';

export function getCondPgto({ offset = 0, limit = 25 }) {
    return getConsultaCached("condPgto", {
        params: { offset, limit }
    });
}

export function getCondPgtoByFilter({ filtro, offset = 0, limit = 25 }) {
    return getConsultaCached(`condPgto/${filtro}`, {
        params: { offset, limit }
    });
}
