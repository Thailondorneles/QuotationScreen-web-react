import axios from 'axios';

const simFreteApi = axios.create({
    baseURL: 'http://localhost:3001',
    timeout: 20000
});

const UNIDADES = {
    201: {
        cnpj: '02494715000173',
        cep:  '92120190'
    },
    203: {
        cnpj: '02494715000416',
        cep:  '29167650'
    }
};


function montarPayload({ unidade, cliente, itens }) {

    const config = UNIDADES[unidade];

    if (!config) {
        throw new Error(`Unidade ${unidade} não configurada para cotação`);
    }

    const volumeTotal = itens.reduce((acc, item) =>
        acc + (Number(item.qtdM3 || 0) * Number(item.quantidade || 0)), 0);

    const pesoTotal = itens.reduce((acc, item) =>
        acc + (Number(item.pesoBruto || 0) * Number(item.quantidade || 0)), 0);

    const valorTotal = itens.reduce((acc, item) =>
        acc + (Number(item.valorLista || 0) * Number(item.quantidade || 0)), 0);

    const quantidadeTotal = itens.reduce((acc, item) =>
        acc + Number(item.quantidade || 0), 0);

    return {
        remetenteCnpj: config.cnpj,
        destinatarioCnpj: cliente.cnpj,

        origem: Number(config.cep),
        destino: Number(cliente.cod_cidade),

        volumeTotal: Number(volumeTotal.toFixed(4)),
        valorTotal: Number(valorTotal.toFixed(2)),
        pesoTotal: Number(pesoTotal.toFixed(3)),
        quantidadeTotalDecimal: quantidadeTotal,
        quantidadeTotal
    };
}

function montarPayloadsPorUnidade(itensPedido = [], cliente) {

    if (!Array.isArray(itensPedido)) {
        throw new Error('itensPedido não é um array válido');
    }
    const grupos = {};
    itensPedido.forEach(item => {
        if (!item.unidade || !item.quantidade) return;

        if (!grupos[item.unidade]) {
            grupos[item.unidade] = [];
        }

        grupos[item.unidade].push(item);
    });

    return Object.entries(grupos).map(([unidade, itens]) =>
       montarPayload({ unidade, cliente, itens })
    );

}


async function postSimFrete(payload) {
    console.log(payload)
    return simFreteApi.post('/api/cotacao', payload);
}


export function parseCotacoesSimFrete(apiResponse) {
  return apiResponse.map(r => ({
     unidade: r.origem === '92120190' ? 201 : 203,
     numeroCotacao: r.numeroCotacao,
     origem: r.origem,
     transportadoras: Array.isArray(r.resultadoCotacao)
       ? r.resultadoCotacao.map(c => ({
            nome: c.trechos?.[0]?.sigla || 'N/D',
            prazo: c.prazo ?? null,
            valor: Number(c.freteTotal || 0),
            cnpj: c.trechos?.[0]?.transportadora || null,
            tipoRateio: c.trechos?.[0]?.tipoRateio || null,
            raw: c
         }))
       : []
  }));
}

async function cotarSimFrete(itensPedido, cliente) {

    const payloads = montarPayloadsPorUnidade(itensPedido, cliente);

    if (!payloads.length) {
        throw new Error('Nenhum item válido para cotação');
    }

    const responses = await Promise.all(
        payloads.map(payload => postSimFrete(payload))
    );
    const parsRetorno = parseCotacoesSimFrete(responses.map(r => r.data));
    return parsRetorno
}

export {
    cotarSimFrete,
    montarPayloadsPorUnidade
};
