import { montarVisaoGeral } from './visaoGeral';

const hoje = new Date(2026, 10, 20);
const item = { cod_cliente: 1, des_pessoa: 'Hospital São José', representante: 'Maria', cod_item: 10, cod_unidade: 201, dta_emissao: '2026-05-01', dta_carga: '2026-12-30', qtd_negociada: 100, vlr_uni_bruto: 2, txt_livre1: '08/2026;150;09/2026;150;10/2026;150;' };
const contratos = [{ ...item, num_pedido: 37 }, { ...item, cod_item: 11, num_pedido: 38, dta_carga: '2026-10-30', txt_livre1: '' }, { ...item, cod_cliente: 2, cod_unidade: 203, des_pessoa: 'Clínica Norte', num_pedido: 37, txt_livre1: '' }];
const reservas = [{ ...item, num_pedido: 14, num_pedido_vinculado: 37, qtd_negociada: 200 }];

test('consolida carteira sem misturar pedidos de clientes diferentes e mantém histórico de vencidos', () => {
    const visao = montarVisaoGeral(contratos, reservas, {}, hoje);
    expect(visao.resumo).toMatchObject({ clientes: 2, vigentes: 2, vencidos: 1, itens: 2, contratado: 2800, consumido: 900, efetividade: 75 });
    expect(visao.linhas[0]).toMatchObject({ codigo: '1', quantidadeItens: 1, contratado: 1400, consumido: 900, acima: 1, vencidos: 1, ajustar: 1 });
    expect(visao.linhas[0].itens).toHaveLength(1);
});

test('aplica busca sem acentos, unidade e inclusão de vencidos aos totais', () => {
    expect(montarVisaoGeral(contratos, reservas, { busca: 'sao jose' }, hoje).resumo.clientes).toBe(1);
    expect(montarVisaoGeral(contratos, reservas, { unidade: '203' }, hoje).linhas[0].codigo).toBe('2');
    const todos = montarVisaoGeral(contratos, reservas, { contratos: 'todos' }, hoje);
    expect(todos.resumo.itens).toBe(3);
    expect(todos.unidades).toEqual(['201', '203']);
    expect(montarVisaoGeral(contratos, reservas, { busca: 'inexistente' }, hoje).resumo).toMatchObject({ clientes: 0, itens: 0, consumido: 0, efetividade: null });
});

test('carteira vazia e datas ausentes não quebram nem inventam valor contratado', () => {
    expect(montarVisaoGeral([], [], {}, hoje).linhas).toEqual([]);
    expect(montarVisaoGeral([{ ...item, num_pedido: 1, dta_carga: null }], [], {}, hoje).resumo.contratado).toBeNull();
});

test('indicador de vencidos inclui cliente com apenas contratos encerrados no modo só vigentes', () => {
    const visao = montarVisaoGeral([{ ...item, cod_cliente: 3, num_pedido: 1, dta_carga: '2026-09-30' }], [], {}, hoje);
    expect(visao.linhas).toHaveLength(0);
    expect(visao.resumo).toMatchObject({ vigentes: 0, vencidos: 1, clientes: 0, itens: 0 });
});

test('um item sem vigência não apaga os valores conhecidos do cliente ou da carteira', () => {
    const visao = montarVisaoGeral([{ ...item, num_pedido: 1 }, { ...item, num_pedido: 2, cod_item: 11, dta_carga: null }], [], {}, hoje);
    expect(visao.resumo).toMatchObject({ contratado: 1400, semVigencia: 1, itens: 2 });
    expect(visao.linhas[0]).toMatchObject({ contratado: 1400, semVigencia: 1 });
});

test('vigência inválida não vira zero e respeita filtros ao sinalizar valor parcial', () => {
    const visao = montarVisaoGeral([{ ...item, num_pedido: 1, dta_carga: null }, { ...item, cod_cliente: 2, num_pedido: 2 }], [], { busca: '2' }, hoje);
    expect(visao.resumo).toMatchObject({ contratado: 1400, semVigencia: 0 });
    expect(montarVisaoGeral([{ ...item, num_pedido: 1, dta_carga: null }], [], {}, hoje).resumo).toMatchObject({ contratado: null, semVigencia: 1 });
});
