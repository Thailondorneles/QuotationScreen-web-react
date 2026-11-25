import { useEffect, useRef, useState } from 'react';
import { buscarClienteDemanda, carregarInformacoesCliente } from '../../services/demandaContratos/clientes';

export function useInformacoesCliente() {
    const [codigo, setCodigo] = useState('');
    const [cliente, setCliente] = useState(null);
    const [informacoes, setInformacoes] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');
    const requisicao = useRef(0);
    useEffect(() => () => { requisicao.current += 1; }, []);

    async function consultar(clienteSelecionado, codigoInformado = codigo) {
        const codigoBusca = String(clienteSelecionado?.cod_pessoa ?? codigoInformado).trim();
        if (!codigoBusca) { limpar(); return; }
        if (!/^\d+$/.test(codigoBusca)) { setErro('Informe o código do cliente ou use a lupa para buscar pelo nome.'); return; }
        const id = ++requisicao.current;
        setCodigo(codigoBusca);
        setCliente(null);
        setInformacoes(null);
        setErro('');
        setCarregando(true);
        try {
            const encontrado = await buscarClienteDemanda(codigoBusca);
            if (id !== requisicao.current) return;
            if (!encontrado) { setErro('Cliente não encontrado. Confira o código ou utilize a lupa.'); return; }
            setCliente(encontrado);
            const dados = await carregarInformacoesCliente(encontrado, { cadastroJaConsultado: true });
            if (id === requisicao.current) setInformacoes(dados);
        } catch (error) {
            if (id === requisicao.current) setErro(error.response?.status === 404
                ? 'Cliente não encontrado na sua carteira.'
                : 'Não foi possível consultar o cliente. Tente novamente.');
        } finally {
            if (id === requisicao.current) setCarregando(false);
        }
    }

    function limpar() {
        requisicao.current += 1;
        setCodigo(''); setCliente(null); setInformacoes(null); setErro(''); setCarregando(false);
    }

    function alterarCodigo(valor) {
        requisicao.current += 1;
        setCodigo(valor); setCliente(null); setInformacoes(null); setErro(''); setCarregando(false);
    }

    return { codigo, setCodigo: alterarCodigo, cliente, informacoes, carregando, erro, consultar, limpar };
}
