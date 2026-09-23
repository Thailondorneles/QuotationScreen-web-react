import { getConsultaCached } from './consultaCache';

export function getUf({ offset = 0, limit = 25 }) {
    return getConsultaCached("uf", {
        params: { offset, limit }
    });
}

export function getUfByFilter({ filtro, offset = 0, limit = 25 }) {
    return getConsultaCached(`uf/${filtro}`, {
        params: { offset, limit }
    });
}
