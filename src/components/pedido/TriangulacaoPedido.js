import { FaEraser, FaSearch } from "react-icons/fa";
import { LovClientes } from "../LovClientes.js";
import { LovOperacoes } from "../LovOperacoes.js";

export function TriangulacaoPedido({
    codClienteTriangulacaoDigitado,
    setCodClienteTriangulacaoDigitado,
    setClienteTriangulacao,
    buscarClienteTriangulacaoPorCodigo,
    clienteTriangulacao,
    setOpenLovTriangulacao,
    openLovTriangulacao,
    codOperacaoTriangulacaoDigitado,
    setCodOperacaoTriangulacaoDigitado,
    setOperacaoTriangulacao,
    buscarOperacaoTriangulacaoPorCodigo,
    operacaoTriangulacao,
    setModalErro,
    setOpenLovOperacoesTriangulacao,
    openLovOperacoesTriangulacao
}) {
    return (
        <div className="triang-card">
                <h2 className="pedido-title">Triangulação</h2>
                <div className="form-grid">
                    <label>Cliente:</label>
                    <div className="field-group full">
                        <input type="text" className='input-cod'
                            value={codClienteTriangulacaoDigitado}
                            onChange={(e) => {
                                setCodClienteTriangulacaoDigitado(e.target.value);
                                setClienteTriangulacao(null);
                            }}
                            onBlur={buscarClienteTriangulacaoPorCodigo}
                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        />
                        <input type="text" className='input-desc' value={clienteTriangulacao?.des_pessoa || ''} readOnly />
                        <FaSearch className="icon" onClick={() => setOpenLovTriangulacao(true)} />
                        <LovClientes
                            isOpen={openLovTriangulacao}
                            setLovOpen={() => setOpenLovTriangulacao(!openLovTriangulacao)}
                            onSelect={(cli) => {
                                setClienteTriangulacao(cli);
                                setCodClienteTriangulacaoDigitado(cli.cod_pessoa);
                            }}
                        />
                        <FaEraser className="icon"
                            onClick={() => {
                                setClienteTriangulacao(null);
                                setCodClienteTriangulacaoDigitado('');
                            }}
                        />
                    </div>
                    <label>Operação:</label>
                    <div className="field-group full">
                        <input
                            type="text"
                            className='input-cod'
                            value={codOperacaoTriangulacaoDigitado}
                            onChange={(e) => {
                                setCodOperacaoTriangulacaoDigitado(e.target.value);
                                setOperacaoTriangulacao({ cod_oper: null, des_oper: null });
                            }}
                            onBlur={buscarOperacaoTriangulacaoPorCodigo}
                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        />
                        <input
                            type="text"
                            className='input-desc'
                            value={operacaoTriangulacao.des_oper || ''}
                            readOnly
                        />
                        <FaSearch className="icon" onClick={() => { if (!clienteTriangulacao) { setModalErro({ aberto: true, mensagem: 'Selecione um cliente de triangulação primeiro.' }); return; } setOpenLovOperacoesTriangulacao(true); }} />
                        <LovOperacoes
                            isOpen={openLovOperacoesTriangulacao}
                            setLovOpen={() => setOpenLovOperacoesTriangulacao(!openLovOperacoesTriangulacao)}
                            onSelect={(op) => {
                                setOperacaoTriangulacao({ cod_oper: op.cod_oper, des_oper: op.des_oper });
                                setCodOperacaoTriangulacaoDigitado(op.cod_oper);
                            }}
                        />
                        <FaEraser
                            className="icon"
                            onClick={() => {
                                setOperacaoTriangulacao({ cod_oper: null, des_oper: null });
                                setCodOperacaoTriangulacaoDigitado('');
                            }}
                        />
                    </div>
                </div>
            </div>
    );
}
