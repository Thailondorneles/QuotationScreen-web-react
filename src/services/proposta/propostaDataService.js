import { EMPRESA_PROPOSTA } from '../../config/propostaConfig.js';
import { parametros } from '../../config/parametrosAplicacao';
import { calcularCobrancaFrete } from '../../utils/cobrancaFrete.js';

function numeroDecimal(valor) {
    const texto = String(valor ?? '').trim();
    const normalizado = texto.includes(',')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto;
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
}

function adicionarDias(data, dias) {
    const resultado = new Date(data);
    resultado.setDate(resultado.getDate() + dias);
    return resultado;
}

function primeiroValor(...valores) {
    return valores.find(valor => valor !== null && valor !== undefined && String(valor).trim() !== '') ?? '';
}

function montarEndereco(dados) {
    const endereco = dados.endereco || {};
    return {
        cep: endereco.cep || '',
        uf: endereco.uf || '',
        cidade: endereco.cidade || '',
        tipoLogradouro: endereco.tipoLogradouro || '',
        logradouro: endereco.logradouro || '',
        numero: endereco.numero || '',
        complemento: endereco.complemento || '',
        bairro: endereco.bairro || '',
        referencia: endereco.referencia || ''
    };
}

export function criarPropostasPorUnidade(dados) {
    const agora = new Date();
    const validade = adicionarDias(agora, parametros.PROPOSTA_VALIDADE_DIAS);
    const itensSelecionados = (dados.itensPedido || []).filter(item => item.selecionado);
    const unidades = [...new Set(itensSelecionados.map(item => Number(item.unidade)))].sort((a, b) => a - b);
    const cobranca = calcularCobrancaFrete(dados.itensPedido || [], dados.freteSelecionado || {}, dados.opcaoFrete, dados.cobrancaFrete);

    return unidades.map(unidade => {
        const itens = itensSelecionados
            .filter(item => Number(item.unidade) === unidade)
            .map(item => {
                const quantidade = numeroDecimal(item.quantidade);
                const valorUnitario = numeroDecimal(item.valorLista);
                return {
                    sequencia: item.numItem ?? item.seq,
                    codigo: item.cod_item,
                    descricao: item.descricao || item.des_item || '',
                    principioAtivo: item.principiosAtivos || item.principios_ativos || '',
                    marca: item.marca || item.cod_completo || '',
                    unidadeMedida: item.unidadeMedida || '',
                    quantidade,
                    valorUnitario,
                    valorTotal: quantidade * valorUnitario
                };
            });
        const freteSelecionado = dados.freteSelecionado?.[unidade] || null;
        const totalProdutos = itens.reduce((total, item) => total + item.valorTotal, 0);
        const valorFrete = cobranca.porUnidade[unidade] || 0;
        const cobrarFreteNaNf = dados.opcaoFrete === 'COBRAR_NF';
        const configUnidade = EMPRESA_PROPOSTA.unidades[unidade] || { nome: `Unidade ${unidade}`, cnpj: '' };

        return {
            empresa: {
                ...EMPRESA_PROPOSTA,
                unidade: unidade,
                nomeUnidade: configUnidade.nome,
                cnpj: configUnidade.cnpj
            },
            emissao: agora,
            validade,
            cliente: {
                codigo: dados.cliente?.cod_pessoa || '',
                nome: dados.cliente?.des_pessoa || '',
                cidade: primeiroValor(dados.cliente?.des_cidade, dados.clienteDetalhado?.des_cidade),
                cnpj: primeiroValor(dados.clienteDetalhado?.cnpj, dados.clienteDetalhado?.num_cnpj_cpf, dados.cliente?.cnpj),
                telefone: primeiroValor(dados.clienteDetalhado?.telefone, dados.clienteDetalhado?.num_fone, dados.cliente?.num_fone, dados.cliente?.telefone),
                email: primeiroValor(dados.clienteDetalhado?.email, dados.clienteDetalhado?.des_email, dados.cliente?.des_email, dados.cliente?.email)
            },
            representante: {
                codigo: dados.representante?.cod_pessoa_rep || '',
                nome: dados.representante?.des_pessoa || ''
            },
            condicaoPagamento: {
                codigo: dados.condicaoPagamento?.cod_cond_pgto || '',
                descricao: dados.condicaoPagamento?.des_cond_pgto || ''
            },
            ordemCompra: dados.ordemCompra || '',
            dataCarga: dados.dataCarga || '',
            observacoes: (dados.observacoes || [])
                .filter(observacao => observacao.pedido)
                .map(observacao => observacao.descricao)
                .filter(Boolean),
            enderecoEntrega: montarEndereco(dados),
            itens,
            frete: freteSelecionado || (cobrarFreteNaNf && valorFrete > 0) ? {
                cotado: true,
                transportadora: freteSelecionado?.nome || '',
                prazo: freteSelecionado?.prazo,
                valor: cobrarFreteNaNf ? valorFrete : null,
                valorVisivel: cobrarFreteNaNf,
                modalidade: cobrarFreteNaNf ? 'COBRAR_NF' : 'CIF'
            } : { cotado: false, transportadora: '', prazo: null, valor: null, valorVisivel: false, modalidade: dados.opcaoFrete || 'CIF' },
            totalProdutos,
            totalProposta: totalProdutos + (cobrarFreteNaNf ? valorFrete : 0)
        };
    });
}

export function validarDadosProposta(dados) {
    if (!dados.cliente?.cod_pessoa) return 'Selecione um cliente antes de emitir a proposta.';
    if (!dados.condicaoPagamento?.cod_cond_pgto) return 'Selecione uma condição de pagamento antes de emitir a proposta.';
    if (!(dados.itensPedido || []).some(item => item.selecionado)) return 'Selecione ao menos um item para emitir a proposta.';
    return null;
}
