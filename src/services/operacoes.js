import { getConsultaCached } from './consultaCache';

export function getOperacoes({ offset = 0, limit = 25 }) {
    return getConsultaCached("operacoes", {
        params: { offset, limit }
    });
}

export function getOperacoesByFilter({ filtro, offset = 0, limit = 25 }) {
    return getConsultaCached(`operacoes/${filtro}`, {
        params: { offset, limit }
    });
}
