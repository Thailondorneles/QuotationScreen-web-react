import { montarSugestoes, periodoVisita } from './sugestoes';
const periodo = { inicio: '2026-06-01', fim: '2026-11-17', meses: 6 };

test('período tem sete meses incluindo mês corrente parcial e atravessa o ano', () => {
    expect(periodoVisita(new Date(2026, 10, 17))).toEqual({ inicio: '2026-05-01', fim: '2026-11-17', meses: 7 });
    expect(periodoVisita(new Date(2026, 0, 31))).toEqual({ inicio: '2025-07-01', fim: '2026-01-31', meses: 7 });
});

test('inclui compra em um único mês sem contrato e exclui contrato vigente e venda fora do período', () => {
    const vendas = [
        { cod_item: 1, dta_emissao: '2026-11-10', quantidade: 6, vlr_total: 60 },
        { cod_item: 2, dta_emissao: '2026-10-01', quantidade: 3, vlr_total: 90 },
        { cod_item: 3, dta_emissao: '2026-10-01', quantidade: 2, vlr_total: 20 },
        { cod_item: 4, dta_emissao: '2026-05-31', quantidade: 3, vlr_total: 10 }
    ];
    const r = montarSugestoes(vendas, [{ cod_item: 2, vencido: false, media: 0, quantidade: 3 }, { cod_item: 3, vencido: true }], periodo);
    expect(r.fora.map(item => item.codigo)).toEqual(['1', '3']);
    expect(r.fora[0].media).toBe(1);
    expect(r.total).toBe(170);
    expect(r.emContrato).toBe(90);
    expect(r.foraContrato).toBe(80);
});

test('último preço pondera as vendas do mesmo dia e devolução não vira última compra', () => {
    const r = montarSugestoes([
        { cod_item: 1, dta_emissao: '2026-11-10', quantidade: 2, vlr_total: 20 },
        { cod_item: 1, dta_emissao: '2026-11-10', quantidade: 3, vlr_total: 60 },
        { cod_item: 1, dta_emissao: '2026-11-12', quantidade: -1, vlr_total: -10 },
        { cod_item: 2, dta_emissao: '2026-11-12', quantidade: -1, vlr_total: -5 }
    ], [], periodo);
    expect(r.fora).toHaveLength(1);
    expect(r.fora[0]).toEqual(expect.objectContaining({ ultimoPreco: 16, ultimaData: '2026-11-10', quantidade: 4, valor: 70 }));
    expect(r.total).toBe(65);
});

test('inclui somente Acima de 110%, mantém a base da reserva e não inclui contrato vencido', () => {
    const r = montarSugestoes([], [
        { cod_item: 1, vencido: false, quantidade: 100, media: 105, vlr_uni_bruto: 2 },
        { cod_item: 2, vencido: false, quantidade: 10, media: 10 },
        { cod_item: 3, vencido: true, quantidade: 1, media: 100 },
        { cod_item: 4, vencido: false, quantidade: 20, quantidadeContratada: null, media: 30, vlr_uni_bruto: 3 },
        { cod_item: 5, vencido: false, quantidade: 100, media: 110 },
        { cod_item: 6, vencido: false, quantidade: 100, media: 110.01, vlr_uni_bruto: 1 }
    ], periodo);
    expect(r.acima.map(item => item.cod_item)).toEqual([4, 6]);
    expect(r.acima[0].excedente).toBe(30);
});
