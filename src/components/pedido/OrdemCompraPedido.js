export function OrdemCompraPedido({
    ordemCompra,
    setOrdemCompra,
    validarOrdemCompra
}) {
    return (
        <div className="oc-card">
                <h2 className="pedido-title">Ordem de Compra</h2>
                <label>Ordem de Compra: </label>
                <input
                    type="text"
                    className='input-desc'
                    value={ordemCompra}
                    maxLength={20}
                    data-field="ordem-compra"
                    onChange={(e) => setOrdemCompra(e.target.value)}
                    onBlur={validarOrdemCompra}
                />
            </div>
    );
}
