import { getClienteByFilter, getClienteDetalhado } from '../clientes';
import { getRepresentantesByCliente } from '../representantes';

function lerItens(resposta) {
    if (!Array.isArray(resposta?.data?.items)) throw new Error('Resposta inválida na consulta do cliente.');
    return resposta.data.items;
}

export async function buscarClienteDemanda(codigo) {
    const itens = lerItens(await getClienteByFilter({ filtro: codigo }));
    return itens.find(item => String(item.cod_pessoa) === String(codigo)) || null;
}

export async function carregarInformacoesCliente(cliente, { cadastroJaConsultado = false } = {}) {
    const codigo = String(cliente.cod_pessoa);
    const resultados = await Promise.allSettled([
        cadastroJaConsultado ? Promise.resolve([cliente]) : getClienteByFilter({ filtro: codigo }).then(lerItens),
        getClienteDetalhado({ codPessoa: codigo }).then(lerItens),
        getRepresentantesByCliente({ filtro: codigo }).then(lerItens)
    ]);
    const [cadastro, detalhes, representantes] = resultados;
    const cadastroCliente = cadastro.status === 'fulfilled'
        ? cadastro.value.find(item => String(item.cod_pessoa) === codigo) : null;
    const detalheCliente = detalhes.status === 'fulfilled'
        ? detalhes.value.find(item => item.cod_pessoa != null && String(item.cod_pessoa) === codigo)
            || detalhes.value.find(item => item.cod_pessoa == null) : null;
    const avisos = [];
    if (cadastro.status === 'rejected') avisos.push('Não foi possível atualizar os dados de cadastro e contato.');
    if (detalhes.status === 'rejected') avisos.push('Não foi possível carregar os dados complementares do cliente.');
    if (representantes.status === 'rejected') avisos.push('Não foi possível carregar os representantes do cliente.');
    const dados = { ...cliente };
    // Dados vazios das consultas complementares não apagam informações do cadastro.
    [cadastroCliente, detalheCliente].forEach(origem => Object.entries(origem || {}).forEach(([campo, valor]) => {
        if (valor !== null && valor !== undefined && String(valor).trim() !== '') dados[campo] = valor;
    }));
    return { cliente: dados, representantes: representantes.status === 'fulfilled' ? representantes.value : [], avisos };
}
