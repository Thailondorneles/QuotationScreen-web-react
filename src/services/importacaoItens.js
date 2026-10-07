import { baixarBlob } from './proposta/propostaDownloadService';

const COLUNAS = ['Unidade', 'Codigo do item', 'Quantidade', 'Valor unitario'];

export async function baixarModeloItens() {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Itens');
    sheet.addRow(COLUNAS);
    sheet.addRow([201, 7084, 50, 8.1615]);
    sheet.addRow([203, 7084, 100, 8.1615]);
    sheet.columns.forEach(col => { col.width = 22; });
    sheet.getRow(1).font = { bold: true };
    sheet.getColumn(3).numFmt = '#,##0.0000';
    sheet.getColumn(4).numFmt = '#,##0.0000';
    const help = workbook.addWorksheet('Instrucoes');
    help.getColumn(1).width = 110;
    [
        'Preencha a aba Itens, mantendo os quatro cabecalhos.',
        'Substitua as linhas de exemplo pelos produtos desejados.',
        'Uma linha por produto e unidade (201 ou 203). Valor unitario, nao valor total.',
        'Use celulas numericas, sem formulas. Quantidade e valor devem ser positivos.',
        'O mesmo produto pode aparecer uma vez em cada unidade, com valores diferentes.',
        'Unidades ausentes ficam desmarcadas. Produtos existentes no pedido nao sao substituidos.',
        'Limite: 200 linhas. Multiplos e regras de preco do sistema serao validados.'
    ].forEach(text => help.addRow([text]));
    baixarBlob(new Blob([await workbook.xlsx.writeBuffer()], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }), 'Modelo_importacao_itens.xlsx');
}

export async function lerPlanilhaItens(file) {
    if (!/\.xlsx$/i.test(file.name)) throw new Error('Selecione um arquivo .xlsx.');
    if (file.size > 5 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 5 MB.');
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.getWorksheet('Itens');
    if (!sheet) throw new Error('A planilha deve conter a aba Itens do modelo.');
    if (COLUNAS.some((name, i) => sheet.getRow(1).getCell(i + 1).value !== name)) {
        throw new Error('Os cabeçalhos devem ser os mesmos do modelo.');
    }
    const rows = [];
    const keys = new Set();
    sheet.eachRow((row, index) => {
        if (index === 1) return;
        const values = [1, 2, 3, 4].map(col => row.getCell(col).value);
        if (values.every(value => value == null || value === '')) return;
        const numbers = values.map(value => {
            if (typeof value === 'number') return value;
            if (typeof value === 'string' && /^\d+(?:[.,]\d+)?$/.test(value.trim())) {
                return Number(value.trim().replace(',', '.'));
            }
            return NaN;
        });
        const [unidade, codigo, quantidade, valor] = numbers;
        if (!numbers.every(Number.isFinite) || ![201, 203].includes(unidade)
            || !Number.isSafeInteger(codigo) || codigo <= 0 || quantidade <= 0 || valor <= 0) {
            throw new Error(`Linha ${index}: informe unidade 201/203, código inteiro, quantidade e valor positivos, sem fórmulas.`);
        }
        const key = `${unidade}|${codigo}`;
        if (keys.has(key)) throw new Error(`Linha ${index}: item ${codigo} repetido na unidade ${unidade}.`);
        keys.add(key);
        rows.push({ unidade, codigo, quantidade, valor, linha: index });
        if (rows.length > 200) throw new Error('Importe no máximo 200 linhas por arquivo.');
    });
    if (!rows.length) throw new Error('A aba Itens está vazia.');
    return rows;
}
