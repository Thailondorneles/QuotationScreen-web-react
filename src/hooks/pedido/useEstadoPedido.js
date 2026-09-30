import { useState, useRef, useContext } from 'react';
import { ParametrosContext } from '../../config/ParametrosContext';

// Estados e referências pertencem à mesma instância da cotação.
export function useEstadoPedido(idRota) {
    const sequenciaPedido = useRef(null);
    const cabecalhoSalvo = useRef(null);
    const clienteRestaurado = useRef(null);
    const operacaoPersistencia = useRef(false);
    const [carregandoPedido, setCarregandoPedido] = useState(Boolean(idRota));
    const [erroCarregamentoPedido, setErroCarregamentoPedido] = useState('');
    const [notasCliente, setNotasCliente] = useState(null);
    const [importacaoAberta, setImportacaoAberta] = useState(false);
    const parametrosCarregados = useContext(ParametrosContext);
    const [openLovItens, setOpenLovItens] = useState(false);
    const [openLovPessoas, setOpenLovPessoas] = useState(false);
    const [openLovTriangulacao, setOpenLovTriangulacao] = useState(false);
    const [openLovRepresentantes, setOpenLovRepresentantes] = useState(false);
    const [openLovOperacoes, setOpenLovOperacoes] = useState(false);
    const [openLovOperacoesTriangulacao, setOpenLovOperacoesTriangulacao] = useState(false);
    const [openLovCondPgto, setOpenLovCondPgto] = useState(false);
    const [openLovCidades, setOpenLovCidades] = useState(false);
    const [openLovUf, setOpenLovUf] = useState(false);
    const [openLovCep, setOpenLovCep] = useState(false);
    const [openLovEnderecos, setOpenLovEnderecos] = useState(false);
    const [cliente, setCliente] = useState(null);
    const [clienteDetalhado, setClienteDetalhado] = useState(null);
    const [clienteTriangulacao, setClienteTriangulacao] = useState(null);
    const [representante, setRepresentante] = useState(null);
    const [operacao, setOperacao] = useState({ cod_oper: null, des_oper: null });
    const [uf, setUf] = useState(null);
    const [cidade, setCidade] = useState(null);
    const [operacaoTriangulacao, setOperacaoTriangulacao] = useState({ cod_oper: null, des_oper: null });
    const [CondPgto, setCondPgto] = useState({ cod_cond_pgto: null, des_cond_pgto: null });
    const [prazoMedioVenda, setPrazoMedioVenda] = useState(null);
    const [clienteConsumidor, setClienteConsumidor] = useState(false);
    const [modalidadeIntegracao, setModalidadeIntegracao] = useState(2);
    const [menuModalidadeIntegracaoOpen, setMenuModalidadeIntegracaoOpen] = useState(false);
    const [opcaoFrete, setOpcaoFrete] = useState('CIF');
    const [cobrancaFrete, setCobrancaFrete] = useState({ tipo: 'PERCENTUAL', valor: '100' });
    const [menuOpcaoFreteOpen, setMenuOpcaoFreteOpen] = useState(false);
    const [menuCobrancaFreteOpen, setMenuCobrancaFreteOpen] = useState(false);
    const [creditoCliente, setCreditoCliente] = useState({
        atingido: null,
        limiteMensal: null,
        titulosVencidos: null
    });
    const [codClienteDigitado, setCodClienteDigitado] = useState('');
    const [codClienteTriangulacaoDigitado, setCodClienteTriangulacaoDigitado] = useState('');
    const [codRepresentanteDigitado, setCodRepresentanteDigitado] = useState('');
    const [codOperacaoDigitado, setCodOperacaoDigitado] = useState('');
    const [codOperacaoTriangulacaoDigitado, setCodOperacaoTriangulacaoDigitado] = useState('');
    const [codCondPgtoDigitado, setCodCondPgtoDigitado] = useState('');
    const [codUfDigitado, setCodUfDigitado] = useState('');
    const [codCidadeDigitado, setCodCidadeDigitado] = useState('');
    const [codCepDigitado, setCodCepDigitado] = useState('');
    const [logradouroDigitado, setLogradouroDigitado] = useState('');
    const [bairroDigitado, setBairroDigitado] = useState('');
    const [numeroEnderecoDigitado, setNumeroEnderecoDigitado] = useState('');
    const [complementoEnderecoDigitado, setComplementoEnderecoDigitado] = useState('');
    const [referenciaEnderecoDigitado, setReferenciaEnderecoDigitado] = useState('');
    const [dataCargaDigitada, setDataCargaDigitada] = useState('');
    const [tiposLogradouro, setTiposLogradouro] = useState([]);
    const [tipoLogradouroSelecionado, setTipoLogradouroSelecionado] = useState('');
    const [itensPedido, setItensPedido] = useState([]);
    const [lotesProximosMap, setLotesProximosMap] = useState({});
    const [modalErro, setModalErro] = useState({
        aberto: false,
        mensagem: '',
        seqItem: null,
        focusSelector: null
    });
    const [modalSucesso, setModalSucesso] = useState({
        aberto: false,
        mensagem: '',
        limparAoFechar: false
    });
    const [modalConfirmacaoErp, setModalConfirmacaoErp] = useState({
        aberto: false,
        mensagem: '',
        unidadesSelecionadas: [],
        situacoesPorUnidade: {}
    });
    const [modalEmitirProposta, setModalEmitirProposta] = useState(false);
    const [gerandoProposta, setGerandoProposta] = useState(false);
    const nextId = useRef(1);
    const nextNumItem = useRef(1);
    const [freteSelecionado, setFreteSelecionado] = useState({
        201: null,
        203: null
    });
    const [cotacoesFrete, setCotacoesFrete] = useState({ 201: [], 203: [] });
    const [loading, setLoading] = useState(false);
    const [loadingDadosCliente, setLoadingDadosCliente] = useState(false);
    const [observacoes, setObservacoes] = useState([]);
    const [historicoCliente, setHistoricoCliente] = useState({
        loading: false,
        ultimaCompra: null,
        erro: false
    });
    const [openObsModal, setOpenObsModal] = useState(false);
    const [obsEditando, setObsEditando] = useState(null);
    const [ordemCompra, setOrdemCompra] = useState('');
    const [menuSelecaoItensOpen, setMenuSelecaoItensOpen] = useState(null);
    const [valorListaEmEdicao, setValorListaEmEdicao] = useState(null);
    const [ordenacaoItens, setOrdenacaoItens] = useState({ coluna: null, direcao: null });
    const [openLovUnidadesPedido, setOpenLovUnidadesPedido] = useState(false);
    const [ultimasComprasClienteMap, setUltimasComprasClienteMap] = useState({});
    const dadosClienteCache = useRef(new Map());
    const representanteClienteCache = useRef(new Map());
    const historicoClienteCache = useRef(new Map());
    const listaPrecoInfoCache = useRef(new Map());
    const classificacoesItemCache = useRef(new Map());
    const recalculoClienteId = useRef(0);

    return {
        sequenciaPedido,
        cabecalhoSalvo,
        clienteRestaurado,
        operacaoPersistencia,
        carregandoPedido,
        setCarregandoPedido,
        erroCarregamentoPedido,
        setErroCarregamentoPedido,
        notasCliente,
        setNotasCliente,
        importacaoAberta,
        setImportacaoAberta,
        parametrosCarregados,
        openLovItens,
        setOpenLovItens,
        openLovPessoas,
        setOpenLovPessoas,
        openLovTriangulacao,
        setOpenLovTriangulacao,
        openLovRepresentantes,
        setOpenLovRepresentantes,
        openLovOperacoes,
        setOpenLovOperacoes,
        openLovOperacoesTriangulacao,
        setOpenLovOperacoesTriangulacao,
        openLovCondPgto,
        setOpenLovCondPgto,
        openLovCidades,
        setOpenLovCidades,
        openLovUf,
        setOpenLovUf,
        openLovCep,
        setOpenLovCep,
        openLovEnderecos,
        setOpenLovEnderecos,
        cliente,
        setCliente,
        clienteDetalhado,
        setClienteDetalhado,
        clienteTriangulacao,
        setClienteTriangulacao,
        representante,
        setRepresentante,
        operacao,
        setOperacao,
        uf,
        setUf,
        cidade,
        setCidade,
        operacaoTriangulacao,
        setOperacaoTriangulacao,
        CondPgto,
        setCondPgto,
        prazoMedioVenda,
        setPrazoMedioVenda,
        clienteConsumidor,
        setClienteConsumidor,
        modalidadeIntegracao,
        setModalidadeIntegracao,
        menuModalidadeIntegracaoOpen,
        setMenuModalidadeIntegracaoOpen,
        opcaoFrete,
        setOpcaoFrete,
        cobrancaFrete,
        setCobrancaFrete,
        menuOpcaoFreteOpen,
        setMenuOpcaoFreteOpen,
        menuCobrancaFreteOpen,
        setMenuCobrancaFreteOpen,
        creditoCliente,
        setCreditoCliente,
        codClienteDigitado,
        setCodClienteDigitado,
        codClienteTriangulacaoDigitado,
        setCodClienteTriangulacaoDigitado,
        codRepresentanteDigitado,
        setCodRepresentanteDigitado,
        codOperacaoDigitado,
        setCodOperacaoDigitado,
        codOperacaoTriangulacaoDigitado,
        setCodOperacaoTriangulacaoDigitado,
        codCondPgtoDigitado,
        setCodCondPgtoDigitado,
        codUfDigitado,
        setCodUfDigitado,
        codCidadeDigitado,
        setCodCidadeDigitado,
        codCepDigitado,
        setCodCepDigitado,
        logradouroDigitado,
        setLogradouroDigitado,
        bairroDigitado,
        setBairroDigitado,
        numeroEnderecoDigitado,
        setNumeroEnderecoDigitado,
        complementoEnderecoDigitado,
        setComplementoEnderecoDigitado,
        referenciaEnderecoDigitado,
        setReferenciaEnderecoDigitado,
        dataCargaDigitada,
        setDataCargaDigitada,
        tiposLogradouro,
        setTiposLogradouro,
        tipoLogradouroSelecionado,
        setTipoLogradouroSelecionado,
        itensPedido,
        setItensPedido,
        lotesProximosMap,
        setLotesProximosMap,
        modalErro,
        setModalErro,
        modalSucesso,
        setModalSucesso,
        modalConfirmacaoErp,
        setModalConfirmacaoErp,
        modalEmitirProposta,
        setModalEmitirProposta,
        gerandoProposta,
        setGerandoProposta,
        nextId,
        nextNumItem,
        freteSelecionado,
        setFreteSelecionado,
        cotacoesFrete,
        setCotacoesFrete,
        loading,
        setLoading,
        loadingDadosCliente,
        setLoadingDadosCliente,
        observacoes,
        setObservacoes,
        historicoCliente,
        setHistoricoCliente,
        openObsModal,
        setOpenObsModal,
        obsEditando,
        setObsEditando,
        ordemCompra,
        setOrdemCompra,
        menuSelecaoItensOpen,
        setMenuSelecaoItensOpen,
        valorListaEmEdicao,
        setValorListaEmEdicao,
        ordenacaoItens,
        setOrdenacaoItens,
        openLovUnidadesPedido,
        setOpenLovUnidadesPedido,
        ultimasComprasClienteMap,
        setUltimasComprasClienteMap,
        dadosClienteCache,
        representanteClienteCache,
        historicoClienteCache,
        listaPrecoInfoCache,
        classificacoesItemCache,
        recalculoClienteId
    };
}
