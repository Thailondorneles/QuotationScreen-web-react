import { parametros } from './parametrosAplicacao';

export const EMPRESA_PROPOSTA = {
    get nome() { return parametros.EMPRESA_NOME; },
    get telefone() { return parametros.EMPRESA_TELEFONE; },
    get email() { return parametros.EMPRESA_EMAIL; },
    unidades: {
        201: {
            nome: 'Matriz',
            cnpj: '02.494.715/0001-73'
        },
        203: {
            nome: 'Filial',
            cnpj: '02.494.715/0004-16'
        }
    }
};
