import { lerConsumos, analisarItem, agruparContratos, resumirContratos, relacionarPedidos, classificarEfetividade, valorContratadoVigencia, montarContratosDemanda, resumirMarca } from './contratos';

test('interpreta meses sem consumo, vírgula decimal e meses repetidos', () => {
    expect(lerConsumos('07/2026;13;08/2026;2,5;08/2026;1;')).toEqual({ '2026-07': 13, '2026-08': 3.5 });
    expect(lerConsumos('inválido;1;13/2026;3;')).toEqual({});
});

test('média inclui meses zerados e exclui mês atual parcial', () => {
    const item = analisarItem({ dta_emissao: '2026-01-01', dta_carga: '2026-12-31', qtd_negociada: 10, txt_livre1: '08/2026;6;10/2026;12;11/2026;99;' }, new Date(2026, 10, 16));
    expect(item.media).toBe(6);
    expect(item.efetividade).toBe(60);
    expect(item.vencido).toBe(false);
});

test('contratos recentes usam somente os meses fechados da vigência', () => {
    const hoje = new Date(2026, 10, 16);
    expect(analisarItem({ dta_emissao: '2026-10-01', qtd_negociada: 10, txt_livre1: '10/2026;8;' }, hoje).media).toBe(8);
    expect(analisarItem({ dta_emissao: '2026-11-01', qtd_negociada: 10 }, hoje).media).toBeNull();
});

test('contrato vencido sem consumo posterior usa os últimos meses da vigência', () => {
    const item = analisarItem({ dta_emissao: '2026-01-01', dta_carga: '2026-06-30', qtd_negociada: 10, txt_livre1: '04/2026;6;05/2026;9;06/2026;12;' }, new Date(2026, 10, 16));
    expect(item.media).toBe(9);
    expect(item.vencido).toBe(true);
});

test('agrupa itens por pedido sem vincular contratos diferentes por semelhança', () => {
    const grupos = agruparContratos([{ num_pedido: 1, cod_item: 20 }, { num_pedido: 1, cod_item: 30 }, { num_pedido: 2, cod_item: 20 }]);
    expect(grupos).toHaveLength(2);
    expect(grupos[0].itens).toHaveLength(2);
});

test('resumo considera somente vigentes e não classifica contrato recente como parado há três meses', () => {
    const resumo = resumirContratos([
        { num_pedido: 1, dta_emissao: '2026-01-01', dta_carga: '2026-12-31', qtd_negociada: 10, vlr_uni_bruto: 2, txt_livre1: '08/2026;6;09/2026;6;10/2026;6;' },
        { num_pedido: 1, dta_emissao: '2026-01-01', dta_carga: '2026-12-31', qtd_negociada: 10, vlr_uni_bruto: 3 },
        { num_pedido: 2, dta_emissao: '2026-11-01', dta_carga: '2026-12-31', qtd_negociada: 5, vlr_uni_bruto: 2 },
        { num_pedido: 3, dta_emissao: '2026-01-01', dta_carga: '2026-06-30', qtd_negociada: 100 }
    ], new Date(2026, 10, 16));
    expect(resumo).toEqual({ contratos: 2, itens: 3, contratado: 60, consumo: 12, efetividade: 30, parados: 1 });
});

test('usa o vínculo real da reserva, elimina repetições e respeita o cliente', () => {
    const contratos = agruparContratos([{ num_pedido: 13042, cod_cliente: 9389 }, { num_pedido: 99, cod_cliente: 9389 }]);
    const reservas = [
        { num_pedido: 13069, cod_cliente: 9389, num_pedido_vinculado: 13042 },
        { num_pedido: 13069, cod_cliente: 9389, num_pedido_vinculado: 13042 },
        { num_pedido: 13070, cod_cliente: 9389, num_pedido_vinculado: 13042 },
        { num_pedido: 999, cod_cliente: 2, num_pedido_vinculado: 13042 }
    ];
    const relacionados = relacionarPedidos(contratos, reservas);
    expect(relacionados.find(item => item.pedido === 13042).pedidos14).toEqual(['13069', '13070']);
    expect(relacionados.find(item => item.pedido === 99).pedidos14).toEqual([]);
});

test('classifica efetividade com tolerância de 10% e distingue ausência de histórico', () => {
    expect(classificarEfetividade(100, 188.68).nome).toBe('Acima');
    expect(classificarEfetividade(1, 89).nome).toBe('Abaixo');
    expect(classificarEfetividade(1, 90).nome).toBe('Dentro');
    expect(classificarEfetividade(1, 110).nome).toBe('Dentro');
    expect(classificarEfetividade(0, 0).nome).toBe('Sem consumo');
    expect(classificarEfetividade(null, null).nome).toBe('Não iniciado');
});

test('valor contratado considera vigência e não apresenta valor mensal como total', () => {
    expect(valorContratadoVigencia([{ dta_emissao: '2026-01-01', dta_carga: '2026-07-01', quantidade: 10, vlr_uni_bruto: 2 }])).toBe(120);
    expect(valorContratadoVigencia([{ quantidade: 10 }])).toBeNull();
});

test('reproduz a composição original: quantidade do 37, preço, vigência e consumo do 14', () => {
    const grupos = montarContratosDemanda([
        { cod_cliente: 1, num_pedido: 370, cod_item: 10, qtd_negociada: 53, vlr_uni_bruto: 99, dta_emissao: '2025-01-01', dta_carga: '2025-07-01', txt_livre1: '10/2026;999;' }
    ], [
        { cod_cliente: 1, num_pedido: 140, num_pedido_vinculado: 370, cod_item: 10, qtd_negociada: 50, vlr_uni_bruto: 8.7, dta_emissao: '2026-08-01', dta_carga: '2027-02-01', txt_livre1: '08/2026;100;09/2026;100;10/2026;100;' }
    ], new Date(2026, 10, 16));
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toEqual(expect.objectContaining({ pedido: 140, pedidos37: ['370'], inicio: '2026-08-01', fim: '2027-02-01' }));
    const item = grupos[0].itens[0];
    expect(item.quantidade).toBe(53);
    expect(item.reservaMensal).toBe(50);
    expect(item.media).toBe(100);
    expect(item.totalConsumido * item.vlr_uni_bruto).toBeCloseTo(2610);
    expect(valorContratadoVigencia(grupos[0].itens)).toBeCloseTo(53 * 6 * 8.7);
    expect(item.vencido).toBe(false);
});

test('preserva itens sem reserva e reservas sem contrato sem somar consumo das duas situações', () => {
    const grupos = montarContratosDemanda([
        { cod_cliente: 1, num_pedido: 370, cod_item: 10, qtd_negociada: 5 },
        { cod_cliente: 1, num_pedido: 370, cod_item: 20, qtd_negociada: 2 }
    ], [{ cod_cliente: 1, num_pedido: 140, num_pedido_vinculado: 370, cod_item: 10, qtd_negociada: 9 },
        { cod_cliente: 1, num_pedido: 141, cod_item: 30, qtd_negociada: 7 }]);
    expect(grupos.flatMap(grupo => grupo.itens)).toHaveLength(3);
    expect(grupos.find(grupo => grupo.origem === '37').itens.map(item => item.cod_item)).toEqual([20]);
    expect(grupos.find(grupo => grupo.pedido === 141).itens[0].quantidadeContratada).toBeNull();
});

test('preserva item do 37 sem reserva própria mesmo quando existe em outro pedido 14 do cliente', () => {
    const grupos = montarContratosDemanda([
        { cod_cliente: 9389, num_pedido: 908980, cod_item: 11064, qtd_negociada: 950 },
        { cod_cliente: 9389, num_pedido: 985006, cod_item: 11064, qtd_negociada: 2229 },
        { cod_cliente: 2, num_pedido: 123, cod_item: 11064, qtd_negociada: 10 }
    ], [{ cod_cliente: 9389, num_pedido: 988825, num_pedido_vinculado: 985006, cod_item: 11064, qtd_negociada: 1400 }]);
    expect(grupos.find(grupo => grupo.pedido === 908980).itens[0].quantidade).toBe(950);
    expect(grupos.find(grupo => grupo.pedido === 988825).itens[0].quantidade).toBe(2229);
    expect(grupos.some(grupo => grupo.pedido === 123)).toBe(true);
});

test('mantém quantidade da reserva quando o vínculo está ausente, sem inferir associação', () => {
    const grupos = montarContratosDemanda([
        { cod_cliente: 9389, num_pedido: 11507, cod_item: 14226, qtd_negociada: 5 }
    ], [{ cod_cliente: 9389, num_pedido: 737832, num_pedido_vinculado: null, cod_item: 14226, qtd_negociada: 80 }]);
    expect(grupos).toHaveLength(2);
    const reserva = grupos.find(grupo => grupo.pedido === 737832);
    expect(reserva.itens[0].quantidade).toBe(80);
    expect(reserva.itens[0].quantidadeContratada).toBeNull();
    expect(reserva.pedidos37).toEqual([]);
});

test('resumo por marca mantém registros de pedidos distintos e calcula efetividade por quantidade', () => {
    const resumo = resumirMarca([
        { cod_item: 10, quantidade: 10, media: 20, vlr_uni_bruto: 2, totalConsumido: 50 },
        { cod_item: 10, quantidade: 20, media: 10, vlr_uni_bruto: 3, totalConsumido: 100 },
        { cod_item: 20, quantidade: 5, media: null, vlr_uni_bruto: 4, totalConsumido: 0 }
    ]);
    expect(resumo).toEqual({ itens: 2, quantidade: 35, media: 30, efetividade: 100, contratado: 100, consumoMedio: 70, consumido: 400 });
});
