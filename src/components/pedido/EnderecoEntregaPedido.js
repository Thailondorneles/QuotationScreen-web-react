import { dataCargaParaIso, dataCargaParaBr, mascararDataCarga } from "../../utils/dataCarga";
import { FaCalendarAlt, FaEraser, FaSearch } from "react-icons/fa";
import { LovCidades } from "../LovCidades.js";
import { LovUf } from "../LovUf.js";
import { LovCep } from "../LovCep.js";
import { LovEnderecos } from "../LovEnderecos.js";

export function EnderecoEntregaPedido({
    carregarTiposLogradouro,
    carregarEnderecoPadraoCliente,
    abrirLovEnderecos,
    codCepDigitado,
    setCodCepDigitado,
    buscarCepPorCodigo,
    setOpenLovCep,
    openLovCep,
    aplicarCep,
    openLovEnderecos,
    setOpenLovEnderecos,
    getCodigoPessoaCliente,
    aplicarEnderecoEntrega,
    codUfDigitado,
    setCodUfDigitado,
    buscarUfPorCodigo,
    getDescricaoUf,
    uf,
    setOpenLovUf,
    openLovUf,
    setUf,
    limparEnderecoCep,
    codCidadeDigitado,
    setCodCidadeDigitado,
    buscarCidadePorCodigo,
    cidade,
    setOpenLovCidades,
    openLovCidades,
    setCidade,
    carregarUfPorCodigo,
    tipoLogradouroSelecionado,
    setTipoLogradouroSelecionado,
    tiposLogradouro,
    logradouroDigitado,
    setLogradouroDigitado,
    numeroEnderecoDigitado,
    setNumeroEnderecoDigitado,
    complementoEnderecoDigitado,
    setComplementoEnderecoDigitado,
    bairroDigitado,
    setBairroDigitado,
    referenciaEnderecoDigitado,
    setReferenciaEnderecoDigitado,
    dataCargaDigitada,
    setDataCargaDigitada,
    setModalErro
}) {
    return (
        <div className="endereco-card" onFocusCapture={carregarTiposLogradouro}>
                <h2 className="pedido-title">Endereço de Entrega</h2>
                <div className="endereco-actions">
                    <button type="button" className="endereco-tab active" onClick={carregarEnderecoPadraoCliente}>PADRÃO</button>
                    <button type="button" className="endereco-tab" onClick={abrirLovEnderecos}>ENDEREÇOS</button>
                </div>
                <div className="endereco-grid">
                    <label>CEP:</label>
                    <div className="endereco-row endereco-row-cep">
                        <input
                            type="text"
                            className="endereco-input endereco-input-small"
                            value={codCepDigitado}
                            onChange={(e) => setCodCepDigitado(e.target.value)}
                            onBlur={buscarCepPorCodigo}
                        />
                        <FaSearch className="info-icon" onClick={() => setOpenLovCep(true)} />
                        <LovCep
                            isOpen={openLovCep}
                            setLovOpen={() => setOpenLovCep(!openLovCep)}
                            codCep={codCepDigitado}
                            onSelect={aplicarCep}
                        />
                        <LovEnderecos
                            isOpen={openLovEnderecos}
                            setLovOpen={setOpenLovEnderecos}
                            codPessoa={getCodigoPessoaCliente()}
                            onSelect={aplicarEnderecoEntrega}
                        />
                    </div>
                    <label>UF:</label>
                    <div className="endereco-row endereco-row-duplo">
                        <input
                            type="text"
                            className="endereco-input endereco-input-uf"
                            value={codUfDigitado}
                            onChange={(e) => setCodUfDigitado(e.target.value)}
                            onBlur={buscarUfPorCodigo}
                        />
                        <input type="text" className="endereco-input endereco-input-wide" value={getDescricaoUf(uf)} readOnly />
                        <div className="endereco-row-icons">
                            <FaSearch className="icon" onClick={() => setOpenLovUf(true)} />
                            <LovUf
                                isOpen={openLovUf}
                                setLovOpen={() => setOpenLovUf(!openLovUf)}
                                codUf={codUfDigitado}
                                onSelect={(ufSelecionada) => {
                                    setUf(ufSelecionada);
                                    setCodUfDigitado(ufSelecionada.cod_uf);
                                }}
                            />
                            <FaEraser className="info-icon" onClick={limparEnderecoCep} />
                        </div>
                    </div>
                    <label>Cidade:</label>
                    <div className="endereco-row endereco-row-duplo">
                        <input type="text" className="endereco-input endereco-input-city-code" value={codCidadeDigitado} onChange={(e) => setCodCidadeDigitado(e.target.value)} onBlur={buscarCidadePorCodigo} />
                        <input type="text" className="endereco-input endereco-input-wide" value={cidade?.des_cidade || ''} readOnly />
                        <div className="endereco-row-icons">
                            <FaSearch className="icon" onClick={() => setOpenLovCidades(true)} />
                            <LovCidades
                                isOpen={openLovCidades}
                                setLovOpen={() => setOpenLovCidades(!openLovCidades)}
                                codIbge={codCidadeDigitado}
                                onSelect={async (cid) => {
                                    setCidade(cid);
                                    setCodCidadeDigitado(cid.cod_ibge);
                                    await carregarUfPorCodigo(cid.cod_uf);
                                }}
                            />
                            <FaEraser className="info-icon" onClick={limparEnderecoCep} />
                        </div>
                    </div>
                    <label>Tipo:</label>
                    <div className="endereco-row">
                        <select
                            className="endereco-input endereco-select"
                            value={tipoLogradouroSelecionado}
                            onChange={(e) => setTipoLogradouroSelecionado(e.target.value)}
                        >
                            <option value="">Selecione</option>
                            {tiposLogradouro.map((tipo) => (
                                <option key={tipo.cod_tipo} value={tipo.des_tipo}>
                                    {tipo.des_tipo}
                                </option>
                            ))}
                        </select>
                    </div>
                    <label>Logradouro:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-logradouro"
                            value={logradouroDigitado}
                            onChange={(e) => setLogradouroDigitado(e.target.value)}
                        />
                    </div>
                    <label>Número:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-small"
                            value={numeroEnderecoDigitado}
                            onChange={(e) => setNumeroEnderecoDigitado(e.target.value)}
                        />
                    </div>
                    <label>Complemento:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-logradouro"
                            value={complementoEnderecoDigitado}
                            onChange={(e) => setComplementoEnderecoDigitado(e.target.value)}
                        />
                    </div>
                    <label>Bairro:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-bairro"
                            value={bairroDigitado}
                            onChange={(e) => setBairroDigitado(e.target.value)}
                        />
                    </div>
                    <label>Referência:</label>
                    <div className="endereco-row">
                        <input
                            type="text"
                            className="endereco-input endereco-input-logradouro"
                            value={referenciaEnderecoDigitado}
                            onChange={(e) => setReferenciaEnderecoDigitado(e.target.value)}
                        />
                    </div>
                    <label>Data da Carga:</label>
                    <div className="endereco-row endereco-row-data">
                        <input
                            type="text"
                            className="endereco-input endereco-input-date"
                            value={dataCargaDigitada}
                            placeholder="dd/mm/aaaa"
                            aria-label="Data da carga"
                            inputMode="numeric"
                            maxLength={10}
                            onChange={(e) => setDataCargaDigitada(mascararDataCarga(e.target.value))}
                            onBlur={() => { if (dataCargaDigitada && !dataCargaParaIso(dataCargaDigitada)) setModalErro({ aberto: true, mensagem: 'Informe uma data da carga válida no formato dd/mm/aaaa.' }); }}
                        />
                        <span className="data-carga-calendario">
                            <FaCalendarAlt className="info-icon" aria-hidden="true" />
                            <input type="date" lang="pt-BR" aria-label="Abrir calendário da data da carga"
                                value={dataCargaParaIso(dataCargaDigitada) || ''}
                                onClick={e => { try { e.currentTarget.showPicker?.(); } catch {} }}
                                onChange={e => setDataCargaDigitada(dataCargaParaBr(e.target.value))} />
                        </span>
                    </div>
                </div>
            </div>
    );
}
