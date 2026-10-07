import { dataCargaParaBr } from "../../utils/dataCarga";
import { consultarPedido } from "../../services/pedidosWeb";
import { useEffect } from 'react';
import { getRepresentantesByIdCliente } from "../../services/representantes.js";
import { getClienteByFilter, getClienteDetalhado } from "../../services/clientes.js";
import { getCondPgtoByFilter } from "../../services/condPgto.js";
import { getOperacoesByFilter } from "../../services/operacoes.js";
import { carregarItensCotacao } from './acoes/carregarItensCotacao';
import { consultarObservacoesPedido } from '../../services/observacoesPedidoWeb';

export function useCarregarCotacao({
    idRota,
    buscarDadosItem,
    setItensPedido,
    setObservacoes,
    nextId,
    nextNumItem,
    setCarregandoPedido,
    setErroCarregamentoPedido,
    sequenciaPedido,
    cabecalhoSalvo,
    assinaturaSalva,
    clienteRestaurado,
    setCliente,
    setClienteDetalhado,
    setPrazoMedioVenda,
    setCreditoCliente,
    setCodClienteDigitado,
    setRepresentante,
    setCodRepresentanteDigitado,
    setOperacao,
    setCodOperacaoDigitado,
    setCondPgto,
    setCodCondPgtoDigitado,
    setClienteConsumidor,
    setModalidadeIntegracao,
    setOpcaoFrete,
    setCobrancaFrete,
    setOrdemCompra,
    setClienteTriangulacao,
    setCodClienteTriangulacaoDigitado,
    setOperacaoTriangulacao,
    setCodOperacaoTriangulacaoDigitado,
    setDataCargaDigitada
}) {
    useEffect(() => {
        if (!idRota) return;
        let ativo = true;
        assinaturaSalva.current = null;
        setCarregandoPedido(true);
        setErroCarregamentoPedido('');
        async function carregar() {
            try {
                const pedido = await consultarPedido(idRota);
                const buscar = async (promessa, campo, codigo) => {
                    if (codigo == null) return null;
                    const resposta = await promessa;
                    return resposta.data?.items?.find(item => String(item[campo]) === String(codigo)) || null;
                };
                const [cadastros, itens, observacoes] = await Promise.all([
                    Promise.all([
                    buscar(getClienteByFilter({ filtro: pedido.codCliente }), 'cod_pessoa', pedido.codCliente),
                    getClienteDetalhado({ codPessoa: pedido.codCliente }),
                    pedido.codRep == null ? null : buscar(getRepresentantesByIdCliente({ cliente: pedido.codCliente, representante: pedido.codRep }), 'cod_pessoa_rep', pedido.codRep),
                    buscar(getOperacoesByFilter({ filtro: pedido.codOper }), 'cod_oper', pedido.codOper),
                    buscar(getCondPgtoByFilter({ filtro: pedido.codCondPgto }), 'cod_cond_pgto', pedido.codCondPgto),
                    pedido.codClienteRemessa == null ? null : buscar(getClienteByFilter({ filtro: pedido.codClienteRemessa }), 'cod_pessoa', pedido.codClienteRemessa),
                    pedido.codOperRemessa == null ? null : buscar(getOperacoesByFilter({ filtro: pedido.codOperRemessa }), 'cod_oper', pedido.codOperRemessa)
                    ]),
                    carregarItensCotacao(pedido, buscarDadosItem, () => ativo),
                    consultarObservacoesPedido(pedido.numSeqPedido)
                ]);
                const [cli, detalhes, rep, oper, cond, remessa, operRemessa] = cadastros;
                if (!ativo) return;
                if (!cli) throw new Error('O cliente salvo nao foi encontrado no cadastro.');
                nextId.current = Math.max(0, ...itens.map(item => item.seq)) + 1;
                nextNumItem.current = Math.max(0, ...itens.map(item => item.numItem)) + 1;
                setItensPedido(itens);
                setObservacoes(observacoes);
                sequenciaPedido.current = pedido.numSeqPedido;
                cabecalhoSalvo.current = pedido;
                clienteRestaurado.current = cli;
                setCliente(cli);
                const detalhe = detalhes.data?.items?.[0] || {};
                setClienteDetalhado({ ...detalhe, ind_consumidor: pedido.indConsumidor });
                setPrazoMedioVenda(detalhe.pmv ?? null);
                setCreditoCliente({ atingido: detalhe.atingido ?? null, limiteMensal: detalhe.vlr_lim_mensal ?? null, titulosVencidos: detalhe.qtd_titulos_vencidos ?? null });
                setCodClienteDigitado(String(pedido.codCliente));
                setRepresentante(rep || (pedido.codRep == null ? null : { cod_pessoa_rep: pedido.codRep }));
                setCodRepresentanteDigitado(pedido.codRep ?? '');
                setOperacao(oper || { cod_oper: pedido.codOper });
                setCodOperacaoDigitado(pedido.codOper);
                setCondPgto(cond || { cod_cond_pgto: pedido.codCondPgto });
                setCodCondPgtoDigitado(pedido.codCondPgto);
                setClienteConsumidor(Number(pedido.indConsumidor) === 1);
                setModalidadeIntegracao(Number(pedido.codModalidade));
                setOpcaoFrete(Number(pedido.tipFrete) === 1 ? 'COBRAR_NF' : 'CIF');
                setCobrancaFrete({ tipo: Number(pedido.indDestaqueFrete) === 1 ? 'VALOR' : 'PERCENTUAL', valor: String(pedido.vlrFrete ?? 0) });
                setOrdemCompra(pedido.desNumOcCliente || '');
                setClienteTriangulacao(remessa || (pedido.codClienteRemessa == null ? null : { cod_pessoa: pedido.codClienteRemessa }));
                setCodClienteTriangulacaoDigitado(pedido.codClienteRemessa ?? '');
                setOperacaoTriangulacao(operRemessa || { cod_oper: pedido.codOperRemessa });
                setCodOperacaoTriangulacaoDigitado(pedido.codOperRemessa ?? '');
                setDataCargaDigitada(dataCargaParaBr(pedido.dtaCarga));

            } catch (error) {
                if (ativo) setErroCarregamentoPedido(error.message || 'Não foi possível carregar a cotação.');
            } finally {
                if (ativo) setCarregandoPedido(false);
            }
        }
        carregar();
        return () => { ativo = false; };
    }, [idRota]);
}
