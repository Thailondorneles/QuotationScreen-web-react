import { getConsultaCached } from './consultaCache';

export function getCidades({ offset = 0, limit = 25 }) {
    return getConsultaCached("cidades", {
        params: { offset, limit }
    });
}

export function getCidadesByFilter({ filtro, offset = 0, limit = 25 }) {
    return getConsultaCached(`cidades/${filtro}`, {
        params: { offset, limit }
    });
}
