import { FaTrash } from "react-icons/fa";
import { LovObservacao } from "../LovObservacao.js";

export function ObservacoesPedido({
    observacoes,
    editarObs,
    removerObs,
    openObsModal,
    setOpenObsModal,
    salvarObs,
    obsEditando,
    cliente,
    setModalErro,
    operacao,
    CondPgto,
    abrirNovaObs
}) {
    return (
        <div className="obs-card">
                <h2 className="pedido-title">Observações</h2>

                <table className="obs-grid">
                    <thead>
                        <tr>
                            <th>Observação</th>
                            <th>Pedido</th>
                            <th>Nota fiscal</th>
                            <th>Registro de saídas</th>
                            <th>Contas a receber</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {observacoes.map(obs => (
                            <tr key={obs.num_seq} onClick={() => editarObs(obs)}>

                                <td className='obs-grid-desc'>{obs.descricao}</td>

                                <td><input type="checkbox" checked={obs.pedido} disabled /></td>
                                <td><input type="checkbox" checked={obs.nota} disabled /></td>
                                <td><input type="checkbox" checked={obs.registro} disabled /></td>
                                <td><input type="checkbox" checked={obs.financeiro} disabled /></td>

                                <td onClick={(e) => e.stopPropagation()}>
                                    <FaTrash onClick={() => removerObs(obs.num_seq)} />
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
                <LovObservacao
                    isOpen={openObsModal}
                    onClose={() => setOpenObsModal(false)}
                    onSave={salvarObs}
                    obs={obsEditando}
                />

                <div className="obs-footer">
                    <button className="btn-adicionar" onClick={() => {
                        if (!cliente) {
                            setModalErro({
                                aberto: true,
                                mensagem: `Selecione um cliente antes de adicionar uma observação!`
                            });
                            return;
                        }
                        if (!operacao.cod_oper) {
                            setModalErro({
                                aberto: true,
                                mensagem: `Selecione uma operação antes de adicionar uma observação!`
                            });
                            return;
                        }
                        if (!CondPgto.cod_cond_pgto) {
                            setModalErro({
                                aberto: true,
                                mensagem: `Selecione uma condição de pagamento antes de adicionar uma observação!`
                            });
                            return;
                        }
                        abrirNovaObs()
                    }
                    }>+ Adicionar</button>
                </div>

            </div>
    );
}
