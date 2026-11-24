import { prepararConsulta, filtrarConsulta, resumirConsulta } from './consultaCliente';

const hoje = new Date(2026, 10, 20);
const item = { cod_cliente: 2484, cod_item: 10, des_item: 'Gaze estéril', dta_emissao: '2026-05-01', dta_carga: '2026-12-30', vlr_uni_bruto: 2, txt_livre1: '08/2026;150;09/2026;150;10/2026;150;' };

test('usa quantidade do 37 vinculado e sugere reserva pela média fechada', () => {
    const linhas = prepararConsulta([{ ...item, num_pedido: 37, qtd_negociada: 100 }], [{ ...item, num_pedido: 14, num_pedido_vinculado: 37, qtd_negociada: 200 }], hoje);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ quantidade: 100, reservaMensal: 200, sugerida: 150, ajustar: true, projecao: 1050, totalContratado: 700, status: { chave: 'acima' } });
    expect(resumirConsulta(linhas, hoje)).toMatchObject({ contratos: 1, itens: 1, quantidade: 100, consumido: 900, efetividade: 150, vencimento: '2026-12-30', dias: 40 });
});

test('preserva item sem reserva e usa reserva como base quando vínculo não corresponde', () => {
    const linhas = prepararConsulta([{ ...item, num_pedido: 37, qtd_negociada: 100 }], [{ ...item, num_pedido: 14, qtd_negociada: 200 }], hoje);
    expect(linhas).toHaveLength(2);
    expect(linhas.find(linha => linha.origem === '14')).toMatchObject({ quantidadeContratada: null, quantidade: 200 });
    expect(linhas.find(linha => linha.origem === '37').reservaMensal).toBeNull();
    expect(filtrarConsulta(linhas, { item: 'esteril', pedido: '14' })).toHaveLength(1);
    expect(filtrarConsulta(linhas, { status: 'acima' })).toHaveLength(1);
});

test('não sugere ajuste sem dois meses fechados ou para item vencido', () => {
    const linhas = prepararConsulta([], [{ ...item, num_pedido: 1, qtd_negociada: 1, dta_emissao: '2026-11-01' }, { ...item, num_pedido: 2, qtd_negociada: 1, dta_carga: '2026-10-30' }], hoje);
    expect(linhas.every(linha => !linha.ajustar)).toBe(true);
    expect(filtrarConsulta(linhas, { status: 'vencidos' })).toHaveLength(1);
});

test('usa unidade do contrato quando reserva não a informa e filtra sem perder Todos', () => {
    const linhas = prepararConsulta([{ ...item, num_pedido: 37, cod_unidade: 201, qtd_negociada: 100 }], [{ ...item, num_pedido: 14, num_pedido_vinculado: 37, qtd_negociada: 200 }], hoje);
    expect(linhas[0].unidade).toBe('201');
    expect(filtrarConsulta(linhas, { unidade: '201' })).toHaveLength(1);
    expect(filtrarConsulta(linhas, { unidade: '203' })).toHaveLength(0);
    expect(filtrarConsulta(linhas)).toHaveLength(1);
});
