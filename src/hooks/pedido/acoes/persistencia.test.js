import { criarAcoesPersistencia } from './persistencia';
import { criarAcoesIntegracao } from './integracao';
import { reservarSequenciaPedido } from '../../../services/sequenciaPedido';
import { salvarCabecalhoPedido } from '../../../services/pedidosWeb';
import { salvarItensPedido } from '../../../services/itensPedidoWeb';
import { salvarObservacoesPedido } from '../../../services/observacoesPedidoWeb';
import { enviarPedidoErp } from '../../../services/pedidosErp';

jest.mock('../../../services/sequenciaPedido', () => ({ reservarSequenciaPedido: jest.fn() }));
jest.mock('../../../services/pedidosWeb', () => ({ salvarCabecalhoPedido: jest.fn() }));
jest.mock('../../../services/itensPedidoWeb', () => ({ salvarItensPedido: jest.fn() }));
jest.mock('../../../services/observacoesPedidoWeb', () => ({ salvarObservacoesPedido: jest.fn() }));
jest.mock('../../../services/pedidosErp', () => ({ enviarPedidoErp: jest.fn() }));
jest.mock('../../../services/itens', () => ({}));
jest.mock('../../../domain/pedido/itensPersistencia', () => ({ montarItensPersistencia: () => [] }));

test('integrar sem salvar aguarda as observações e bloqueia o ERP se a gravação falhar', async () => {
    const etapas = [];
    reservarSequenciaPedido.mockResolvedValue(753);
    salvarCabecalhoPedido.mockImplementation(async () => etapas.push('cabecalho'));
    salvarItensPedido.mockImplementation(async () => etapas.push('itens'));
    let rejeitar;
    salvarObservacoesPedido.mockImplementation(() => {
        etapas.push('observacoes');
        return new Promise((resolve, reject) => { rejeitar = reject; });
    });
    const assinaturaSalva = { current: null };
    const { persistirPedido } = criarAcoesPersistencia({
        itensPedido: [], observacoes: [{ descricao: 'Entrega', pedido: true }],
        cliente: { cod_pessoa: 1 }, operacao: { cod_oper: 1 }, CondPgto: { cod_cond_pgto: 1 },
        cobrancaFrete: { valor: '0' }, sequenciaPedido: { current: null },
        cabecalhoSalvo: { current: null }, assinaturaSalva, assinaturaAtual: 'atual'
    });
    const montarPayloadsPedidoErp = jest.fn();
    const setModalErro = jest.fn();
    const integracao = criarAcoesIntegracao({
        persistirPedido, montarPayloadsPedidoErp, setModalErro,
        operacaoPersistencia: { current: false }, setLoading: jest.fn()
    });
    const envio = integracao.enviarPedidosAoErp([201], {});
    // Aguarda a entrada na gravação das observações, ainda pendente.
    while (!rejeitar) await Promise.resolve();
    expect(etapas).toEqual(['cabecalho', 'itens', 'observacoes']);
    expect(salvarObservacoesPedido).toHaveBeenCalledWith({ numSeqPedido: 753, observacoes: [
        { numSeqObs: 1, txtObs: 'Entrega', indPedido: 1, indNf: 0, indRegistro: 0, indCr: 0 }
    ] });
    expect(montarPayloadsPedidoErp).not.toHaveBeenCalled();
    expect(enviarPedidoErp).not.toHaveBeenCalled();
    rejeitar(new Error('Falha nas observações'));
    await envio;
    expect(enviarPedidoErp).not.toHaveBeenCalled();
    expect(assinaturaSalva.current).toBeNull();
    expect(setModalErro).toHaveBeenCalledWith(expect.objectContaining({ mensagem: 'Falha nas observações' }));
});
