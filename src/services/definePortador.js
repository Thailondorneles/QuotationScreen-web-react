import { unimedApi } from '../config/apis.js';

export async function getPortadorPosicao({ codUnidade, codOper, codCondPgto, codCliente }) {
    const parametros = [codUnidade, codOper, codCondPgto, codCliente];
    if (parametros.some(valor => valor == null || String(valor).trim() === '')) {
        throw new Error('Informe unidade, operação, condição de pagamento e cliente para definir portador e posição.');
    }

    let data;
    try {
        const response = await unimedApi.get(
            `DefinePortador/${parametros.map(valor => encodeURIComponent(String(valor).trim())).join('/')}`
        );
        data = response.data;
    } catch (error) {
        throw new Error(`Não foi possível consultar portador e posição da unidade ${codUnidade}. Pedido não enviado ao ERP. ${error.message}`);
    }

    const codigoValido = valor => (
        typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0
    ) || (typeof valor === 'string' && /^\d+$/.test(valor.trim()));

    if (!codigoValido(data?.codPortador) || !codigoValido(data?.codPosicao)) {
        throw new Error(`DefinePortador não retornou portador e posição válidos para a unidade ${codUnidade}. Pedido não enviado ao ERP.`);
    }

    return {
        codPortador: String(data.codPortador).trim(),
        codPosicao: String(data.codPosicao).trim()
    };
}
