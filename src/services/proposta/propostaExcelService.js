import * as ExcelJS from 'exceljs';
import { carregarLogoProposta } from './propostaAssetsService.js';
import { baixarBlob, nomeArquivoProposta } from './propostaDownloadService.js';

const VERDE = '00844A';

function data(valor) {
    return valor.toLocaleDateString('pt-BR');
}

function enderecoTexto(endereco) {
    return [
        [endereco.tipoLogradouro, endereco.logradouro].filter(Boolean).join(' '),
        endereco.numero,
        endereco.complemento,
        endereco.bairro,
        endereco.cidade,
        endereco.uf,
        endereco.cep ? `CEP ${endereco.cep}` : ''
    ].filter(Boolean).join(' - ');
}

function aplicarTitulo(celula) {
    celula.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${VERDE}` } };
    celula.alignment = { vertical: 'middle' };
}

export async function gerarPropostaExcel(proposta) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = proposta.empresa.nome;
    const sheet = workbook.addWorksheet(`Proposta ${proposta.empresa.unidade}`);
    sheet.columns = [
        { key: 'seq', width: 10 }, { key: 'codigo', width: 16 }, { key: 'descricao', width: 48 },
        { key: 'principio', width: 34 }, { key: 'marca', width: 22 }, { key: 'quantidade', width: 14 },
        { key: 'unitario', width: 18 }, { key: 'total', width: 18 }
    ];

    const logo = await carregarLogoProposta();
    const logoId = workbook.addImage({ base64: logo, extension: 'png' });
    sheet.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 190, height: 90 } });
    [1, 2, 3, 4].forEach(numeroLinha => {
        sheet.getRow(numeroLinha).height = 24;
    });
    sheet.mergeCells('D1:H2');
    sheet.getCell('D1').value = 'PROPOSTA COMERCIAL';
    sheet.getCell('D1').font = { bold: true, size: 18, color: { argb: `FF${VERDE}` } };
    sheet.getCell('D1').alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.mergeCells('D3:H3');
    sheet.getCell('D3').value = `${proposta.empresa.nome} | Unidade ${proposta.empresa.unidade} - ${proposta.empresa.nomeUnidade}`;
    sheet.getCell('D3').alignment = { horizontal: 'right' };
    sheet.mergeCells('D4:H4');
    sheet.getCell('D4').value = `CNPJ ${proposta.empresa.cnpj} | ${proposta.empresa.telefone} | ${proposta.empresa.email}`;
    sheet.getCell('D4').alignment = { horizontal: 'right' };

    const linhasInfo = [
        ['Cliente', `${proposta.cliente.codigo} - ${proposta.cliente.nome}`],
        ['CNPJ / Contato', [proposta.cliente.cnpj, proposta.cliente.telefone, proposta.cliente.email].filter(Boolean).join(' | ') || '-'],
        ['Condição de pagamento', `${proposta.condicaoPagamento.codigo} - ${proposta.condicaoPagamento.descricao}`],
        ['Representante', proposta.representante.nome || '-'],
        ['Emissão / Validade', `${data(proposta.emissao)} / ${data(proposta.validade)}`],
        ['Endereço de entrega', enderecoTexto(proposta.enderecoEntrega) || '-'],
        ['Data de carga', proposta.dataCarga || '-']
    ];
    const primeiraLinhaInfo = 6;
    linhasInfo.forEach((linha, indice) => {
        const numeroLinha = primeiraLinhaInfo + indice;
        sheet.getRow(numeroLinha).height = 22;
        sheet.mergeCells(numeroLinha, 1, numeroLinha, 2);
        sheet.getCell(numeroLinha, 1).value = linha[0];
        sheet.getCell(numeroLinha, 1).font = { bold: true, color: { argb: `FF${VERDE}` } };
        sheet.getCell(numeroLinha, 1).alignment = { vertical: 'middle' };
        sheet.mergeCells(numeroLinha, 3, numeroLinha, 8);
        sheet.getCell(numeroLinha, 3).value = linha[1];
        sheet.getCell(numeroLinha, 3).alignment = { vertical: 'middle', wrapText: true };
    });

    sheet.addRow([]);
    const cabecalho = sheet.addRow(['Seq.', 'Código', 'Descrição', 'Princípio ativo', 'Marca', 'Quantidade', 'Valor unitário', 'Valor total']);
    cabecalho.height = 24;
    cabecalho.eachCell(aplicarTitulo);
    proposta.itens.forEach(item => {
        const linha = sheet.addRow([
            item.sequencia, item.codigo, item.descricao, item.principioAtivo || '-', item.marca || '-',
            item.quantidade, item.valorUnitario, item.valorTotal
        ]);
        linha.getCell(6).numFmt = '#,##0.####';
        linha.getCell(7).numFmt = 'R$ #,##0.0000';
        linha.getCell(8).numFmt = 'R$ #,##0.00';
        linha.alignment = { vertical: 'top', wrapText: true };
    });

    sheet.addRow([]);
    const totalProdutos = sheet.addRow(['', '', '', '', '', '', 'Total dos produtos', proposta.totalProdutos]);
    totalProdutos.getCell(7).font = { bold: true };
    totalProdutos.getCell(8).numFmt = 'R$ #,##0.00';
    if (proposta.frete.cotado) {
        const frete = sheet.addRow([
            '', '', '', '',
            proposta.frete.transportadora,
            proposta.frete.prazo != null ? `${proposta.frete.prazo} dia(s)` : '',
            proposta.frete.valorVisivel ? 'Frete' : 'Frete CIF',
            proposta.frete.valorVisivel ? proposta.frete.valor : ''
        ]);
        frete.getCell(7).font = { bold: true };
        if (proposta.frete.valorVisivel) frete.getCell(8).numFmt = 'R$ #,##0.00';
    }
    const total = sheet.addRow(['', '', '', '', '', '', 'TOTAL DA PROPOSTA', proposta.totalProposta]);
    aplicarTitulo(total.getCell(7));
    aplicarTitulo(total.getCell(8));
    total.getCell(8).numFmt = 'R$ #,##0.00';
    if (proposta.observacoes.length) {
        const observacoes = sheet.addRow(['Observações', proposta.observacoes.join('\n')]);
        observacoes.getCell(1).font = { bold: true, color: { argb: `FF${VERDE}` } };
        sheet.mergeCells(observacoes.number, 2, observacoes.number, 8);
        observacoes.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    }

    sheet.views = [{ state: 'frozen', ySplit: cabecalho.number }];
    sheet.autoFilter = { from: { row: cabecalho.number, column: 1 }, to: { row: cabecalho.number, column: 8 } };
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    const buffer = await workbook.xlsx.writeBuffer();
    baixarBlob(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        nomeArquivoProposta(proposta, 'xlsx')
    );
}
