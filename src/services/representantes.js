import { getConsultaCached } from './consultaCache';

export function getRepresentantesByCliente({ filtro, offset = 0, limit = 25 }) {

    return getConsultaCached(`representantesCliente/${filtro}`, {
        params: { offset, limit }
    });
}


export function getRepresentantesByIdCliente({ cliente, representante, offset = 0, limit = 25 }) {
    return getConsultaCached(`representantes/${representante}/${cliente}`, {
        params: { offset, limit }
    });
}