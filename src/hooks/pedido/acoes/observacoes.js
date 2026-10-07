import { getClientesComentarios } from "../../../services/clientes.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarAcoesObservacoes({
    setObsEditando,
    setOpenObsModal,
    obsEditando,
    setObservacoes,
    observacoes,
    ordemCompra,
    setModalErro
}) {
    function abrirNovaObs() {
        setObsEditando(null);
        setOpenObsModal(true);
    }

    function editarObs(obs) {
        setObsEditando(obs);
        setOpenObsModal(true);
    }

    function salvarObs(obs) {
        if (obsEditando) {
            setObservacoes(prev =>
                prev.map(o => o.num_seq === obs.num_seq ? obs : o)
            );
        } else {
            setObservacoes(prev => [
                ...prev,
                { ...obs, num_seq: prev.length + 1 }
            ]);
        }

        setOpenObsModal(false);
        setObsEditando(null);
    }

    function removerObs(seq) {
        const lista = observacoes
            .filter(o => o.num_seq !== seq)
            .map((o, i) => ({ ...o, num_seq: i + 1 }));

        setObservacoes(lista);
    }

    async function carregarObservacoesCliente(codCliente) {
        try {
            const response = await getClientesComentarios({
                filtro: codCliente,
                offset: 0,
                limit: 50
            });

            const lista = response.data.items || [];

            const observacoesFormatadas = lista
                .sort((a, b) => (a.seq_exibicao || 0) - (b.seq_exibicao || 0))
                .map((obs, index) => ({
                    num_seq: index + 1,
                    seq_comentario: obs.seq_comentario,
                    descricao: obs.des_comentario,
                    pedido: false,
                    nota: false,
                    registro: false,
                    financeiro: false
                }));

            setObservacoes(observacoesFormatadas);
        } catch (error) {
        }
    }

    function validarOrdemCompra() {
        const possuiCaracterEspecial = /[\|/]/.test(ordemCompra);

        if (!possuiCaracterEspecial) return;

        setModalErro({
            aberto: true,
            mensagem: 'A ordem de compra nao pode conter caracteres especiais como | ou /',
            seqItem: null,
            focusSelector: 'input[data-field="ordem-compra"]'
        });
    }

    return { abrirNovaObs, editarObs, salvarObs, removerObs, carregarObservacoesCliente, validarOrdemCompra };
}
