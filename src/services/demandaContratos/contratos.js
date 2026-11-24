import { unimedApi } from '../../config/apis';
import { consultarComCache } from '../consultaCache';

export function consultarDemandaSituacao(situacao, codCliente) {
    if (![14, 37].includes(situacao)) return Promise.reject(new Error('Situação de contrato inválida.'));
    const codigo = String(codCliente ?? '').trim();
    if (!/^\d+$/.test(codigo)) return Promise.reject(new Error('Informe o código do cliente.'));
    return consultarSituacao(situacao, codigo);
}

function consultarSituacao(situacao, codigo) {
    return consultarComCache(`demandaContratos|${situacao}|${codigo ?? 'todos'}`, async () => {
        const itens = [];
        let offset = 0;
        let mais;
        do {
            const { data } = await unimedApi.get('demandaContratos', { params: { ...(codigo == null ? {} : { cod_cliente: codigo }), situacao, offset, limit: 2000 } });
            if (!Array.isArray(data?.items) || (data.hasMore && !data.items.length)) {
                throw new Error('Resposta inválida na consulta de contratos.');
            }
            itens.push(...data.items.map(item => ({ ...item,
                cod_unidade: item.cod_unidade ?? item.Cod_unidade ?? item.COD_UNIDADE ?? null
            })));
            offset += data.items.length;
            mais = data.hasMore === true;
        } while (mais);
        return itens;
    });
}

export async function carregarVisaoGeral() {
    const resultados = await Promise.allSettled([consultarSituacao(37), consultarSituacao(14)]);
    return {
        contratos: resultados[0].status === 'fulfilled' ? resultados[0].value : null,
        reservas: resultados[1].status === 'fulfilled' ? resultados[1].value : null,
        erros: resultados.flatMap((resultado, indice) => resultado.status === 'rejected'
            ? [`Não foi possível carregar ${indice === 0 ? 'os contratos (situação 37)' : 'as reservas (situação 14)'}. O resumo está incompleto.`] : [])
    };
}

export async function carregarContratosCliente(codigo) {
    const resultados = await Promise.allSettled([consultarDemandaSituacao(37, codigo), consultarDemandaSituacao(14, codigo)]);
    const filtrar = resultado => resultado.status === 'fulfilled'
        ? resultado.value.filter(item => String(item.cod_cliente) === String(codigo)) : null;
    return {
        contratos: filtrar(resultados[0]), reservas: filtrar(resultados[1]),
        erros: resultados.flatMap((resultado, indice) => resultado.status === 'rejected'
            ? [`Não foi possível carregar ${indice === 0 ? 'os contratos (situação 37)' : 'as reservas (situação 14)'}. Tente novamente.`] : [])
    };
}
