import { getCepsByFilter } from "../../../services/ceps.js";
import { getEnderecosPadraoByFilter } from "../../../services/enderecosPadrao.js";
import { getCidadesByFilter } from "../../../services/cidades.js";
import { getUfByFilter } from "../../../services/uf.js";
import { getTodosTiposLogradouro } from "../../../services/tipLogradouro.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesEnderecos({
    tiposLogradouro,
    setCidade,
    setCodCidadeDigitado,
    setUf,
    setCodUfDigitado,
    setCodCepDigitado,
    setLogradouroDigitado,
    setBairroDigitado,
    setNumeroEnderecoDigitado,
    setComplementoEnderecoDigitado,
    setReferenciaEnderecoDigitado,
    setDataCargaDigitada,
    setTipoLogradouroSelecionado,
    setOpenLovEnderecos,
    setTiposLogradouro,
    getCodigoPessoaCliente,
    setModalErro,
    codCepDigitado,
    codCidadeDigitado,
    codUfDigitado
}) {
    function getDescricaoUf(item) {
        return item?.des_uf || '';
    }

    function getDescricaoTipoLogradouro(codTipo, tipos = tiposLogradouro) {
        const tipo = tipos.find(item => String(item.cod_tipo) === String(codTipo));
        return tipo?.des_tipo || '';
    }

    function getCodigoTipoLogradouro(desTipo) {
        const descricao = String(desTipo ?? '').trim().toUpperCase();
        const tipo = tiposLogradouro.find(item =>
            String(item.des_tipo ?? '').trim().toUpperCase() === descricao
        );

        return tipo?.cod_tipo ?? null;
    }

    function limparCidadeUf() {
        setCidade(null);
        setCodCidadeDigitado('');
        setUf(null);
        setCodUfDigitado('');
    }

    function limparEnderecoCep() {
        setCodCepDigitado('');
        setLogradouroDigitado('');
        setBairroDigitado('');
        setNumeroEnderecoDigitado('');
        setComplementoEnderecoDigitado('');
        setReferenciaEnderecoDigitado('');
        setDataCargaDigitada('');
        setTipoLogradouroSelecionado('');
        setOpenLovEnderecos(false);
        limparCidadeUf();
    }

    async function carregarTiposLogradouro() {
        try {
            const tiposValidos = await getTodosTiposLogradouro();
            setTiposLogradouro(tiposValidos);
            return tiposValidos;
        } catch (error) {
            return [];
        }
    }

    async function aplicarCep(cep) {
        if (!cep) {
            limparEnderecoCep();
            return;
        }

        const tipos = await carregarTiposLogradouro();
        setCodCepDigitado(cep.num_cep || '');
        setLogradouroDigitado(cep.des_logradouro || '');
        setBairroDigitado(cep.des_bairro || '');
        setTipoLogradouroSelecionado(getDescricaoTipoLogradouro(cep.cod_tipo, tipos));
        setCodCidadeDigitado(cep.cod_ibge ? String(cep.cod_ibge) : '');
        setCidade(cep.cod_ibge ? {
            cod_ibge: cep.cod_ibge,
            des_cidade: cep.des_cidade,
            cod_uf: cep.cod_uf
        } : null);
        await carregarUfPorCodigo(cep.cod_uf);
    }

    async function aplicarEnderecoEntrega(endereco) {
        if (!endereco) {
            limparEnderecoCep();
            return;
        }

        const tipos = await carregarTiposLogradouro();
        if (endereco.num_cep) {
            try {
                const response = await getCepsByFilter({
                    filtro: endereco.num_cep,
                    offset: 0,
                    limit: 1
                });
                const cepEncontrado = response.data.items?.[0];

                if (cepEncontrado) {
                    await aplicarCep(cepEncontrado);
                    setNumeroEnderecoDigitado(endereco.num_logradouro || '');
                    setTipoLogradouroSelecionado(getDescricaoTipoLogradouro(endereco.cod_tipo_logradouro, tipos));
                    return;
                }
            } catch (error) {
            }
        }

        setCodCepDigitado(endereco.num_cep || '');
        setLogradouroDigitado(endereco.des_endereco || '');
        setBairroDigitado(endereco.des_bairro || '');
        setNumeroEnderecoDigitado(endereco.num_logradouro || '');
        setTipoLogradouroSelecionado(getDescricaoTipoLogradouro(endereco.cod_tipo_logradouro, tipos));
        setCodCidadeDigitado('');
        setCidade(endereco.des_cidade ? {
            cod_ibge: '',
            des_cidade: endereco.des_cidade,
            cod_uf: endereco.cod_uf
        } : null);
        await carregarUfPorCodigo(endereco.cod_uf);
    }

    function abrirLovEnderecos() {
        if (!getCodigoPessoaCliente()) {
            setModalErro({
                aberto: true,
                mensagem: 'Selecione um cliente antes de consultar os enderecos!'
            });
            return;
        }

        setOpenLovEnderecos(true);
    }

    async function carregarEnderecoPadraoCliente() {
        const codPessoa = getCodigoPessoaCliente();

        if (!codPessoa) {
            setModalErro({
                aberto: true,
                mensagem: 'Selecione um cliente antes de consultar o endereco padrao!'
            });
            return;
        }

        try {
            const response = await getEnderecosPadraoByFilter({
                filtro: codPessoa,
                offset: 0,
                limit: 1
            });

            const enderecoPadrao = response.data.items?.[0];

            if (!enderecoPadrao) {
                limparEnderecoCep();
                setModalErro({
                    aberto: true,
                    mensagem: 'Cliente nao possui endereco padrao cadastrado!'
                });
                return;
            }

            await aplicarEnderecoEntrega(enderecoPadrao);
        } catch (error) {
            alert('Erro ao buscar endereco padrao');
        }
    }

    async function buscarCepPorCodigo() {
        if (!codCepDigitado) {
            limparEnderecoCep();
            return;
        }

        try {
            const response = await getCepsByFilter({
                filtro: codCepDigitado,
                offset: 0,
                limit: 1
            });
            const cep = response.data.items?.[0];

            if (!cep) {
                limparEnderecoCep();
                return;
            }

            await aplicarCep(cep);
        } catch (error) {
            alert('Erro ao buscar CEP');
        }
    }

    async function buscarCidadePorCodigo() {
        if (!codCidadeDigitado) {
            setCidade(null);
            setUf(null);
            setCodUfDigitado('');
            return;
        }

        try {
            const response = await getCidadesByFilter({
                filtro: codCidadeDigitado,
                offset: 0,
                limit: 1
            });
            const cid = response.data.items[0];

            if (!cid) {
                setCidade(null);
                setUf(null);
                setCodUfDigitado('');
                return;
            }

            setCidade(cid);
            setCodCidadeDigitado(cid.cod_ibge);
            await carregarUfPorCodigo(cid.cod_uf);
        } catch (error) {
            alert('Erro ao buscar cidade');
        }
    }

    async function carregarUfPorCodigo(codigoUf) {
        if (!codigoUf) {
            setUf(null);
            setCodUfDigitado('');
            return;
        }

        try {
            const response = await getUfByFilter({
                filtro: codigoUf,
                offset: 0,
                limit: 1
            });
            const ufEncontrada = response.data.items[0];

            if (!ufEncontrada) {
                setUf(null);
                setCodUfDigitado(String(codigoUf));
                return;
            }

            setUf(ufEncontrada);
            setCodUfDigitado(ufEncontrada.cod_uf);
        } catch (error) {
            alert('Erro ao buscar UF');
        }
    }

    async function buscarUfPorCodigo() {
        if (!codUfDigitado) {
            setUf(null);
            return;
        }

        await carregarUfPorCodigo(codUfDigitado);
    }

    return { getDescricaoUf, getDescricaoTipoLogradouro, getCodigoTipoLogradouro, limparCidadeUf, limparEnderecoCep, carregarTiposLogradouro, aplicarCep, aplicarEnderecoEntrega, abrirLovEnderecos, carregarEnderecoPadraoCliente, buscarCepPorCodigo, buscarCidadePorCodigo, carregarUfPorCodigo, buscarUfPorCodigo };
}
