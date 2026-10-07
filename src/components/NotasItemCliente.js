export function NotasItemCliente({ consulta, codCliente, codItem }) {
    const pronta = consulta?.codigo === codCliente && consulta.status === 'pronto';
    const erro = consulta?.codigo === codCliente && consulta.status === 'erro';
    const item = pronta ? consulta.items[String(codItem)] : null;
    const valor = campo => pronta ? (item?.[campo] ?? 0) : !codCliente ? '-' : erro ? 'Indisponível' : 'Carregando...';
    return <div>
        <strong>Notas para o cliente</strong>
        <div className="tip-linha"><span className="tip-nome">NF emitidas:</span><span className="tip-valor">{valor('qtd_notas_venda')}</span></div>
        <div className="tip-linha"><span className="tip-nome">NFD emitidas:</span><span className="tip-valor" style={Number(item?.qtd_notas_devolucao) > 0 ? { color: '#c62828', fontWeight: 700 } : undefined}>{valor('qtd_notas_devolucao')}</span></div>
    </div>;
}
