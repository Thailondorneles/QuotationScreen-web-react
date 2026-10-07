import { dataCargaParaIso } from "../../../utils/dataCarga";
import { obterClienteParaProposta } from "../../../services/clientes.js";
import { criarPropostasPorUnidade, validarDadosProposta } from "../../../services/proposta/propostaDataService.js";
import { exportarPropostas } from "../../../services/proposta/propostaService.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesProposta({
    dataCargaDigitada,
    setModalErro,
    obterDadosPropostaTela,
    setModalEmitirProposta,
    setGerandoProposta
}) {
    function abrirEmissaoProposta() {
        if (dataCargaDigitada && !dataCargaParaIso(dataCargaDigitada)) {
            setModalErro({ aberto: true, mensagem: 'Informe uma data da carga válida no formato dd/mm/aaaa.' });
            return;
        }
        const erro = validarDadosProposta(obterDadosPropostaTela());
        if (erro) {
            setModalErro({ aberto: true, mensagem: erro, seqItem: null, focusSelector: null });
            return;
        }
        setModalEmitirProposta(true);
    }

    async function emitirProposta(formato) {
        try {
            setGerandoProposta(true);
            const dadosProposta = obterDadosPropostaTela();
            dadosProposta.cliente = await obterClienteParaProposta(dadosProposta.cliente);
            const propostas = criarPropostasPorUnidade(dadosProposta);
            await exportarPropostas(propostas, formato);
            setModalEmitirProposta(false);
        } catch (error) {
            setModalEmitirProposta(false);
            setModalErro({
                aberto: true,
                mensagem: error?.message || 'Não foi possível gerar a proposta.',
                seqItem: null,
                focusSelector: null
            });
        } finally {
            setGerandoProposta(false);
        }
    }

    return { abrirEmissaoProposta, emitirProposta };
}
