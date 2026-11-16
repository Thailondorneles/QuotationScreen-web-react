import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import capa from '../../imagens/contrato/pagina-1.jpg';
import itens from '../../imagens/contrato/pagina-2.jpg';
import condicoes from '../../imagens/contrato/pagina-3.jpg';
import assinaturas from '../../imagens/contrato/pagina-4.jpg';
import continuacao from '../../imagens/contrato/continuacao.jpg';
import beneficios from '../../imagens/contrato/beneficios.jpg';
import { baixarBlob, nomeArquivoProposta } from './propostaDownloadService';

const LARGURA = 595.5;
const ALTURA = 842.25;
const VERDE = [0, 85, 79];
const moeda = valor => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const texto = valor => String(valor ?? '').trim() || '-';

// Usa a arte do PDF aprovado. As cláusulas e os campos amarelos do modelo são fixos.
export function criarContratoPdf(proposta, fundos) {
    const doc = new jsPDF({ unit: 'pt', format: [LARGURA, ALTURA] });
    const numero = proposta.numero ? `Nº ${proposta.numero}` : 'Nº -';
    const extensa = proposta.emissao.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    function escrever(valor, x, y, largura, tamanho = 9, negrito = false, maxLinhas = 1) {
        doc.setFont('helvetica', negrito ? 'bold' : 'normal');
        doc.setTextColor(...VERDE);
        let fonte = tamanho;
        let linhas;
        do {
            doc.setFontSize(fonte);
            linhas = doc.splitTextToSize(texto(valor), largura);
            if (linhas.length <= maxLinhas || fonte <= 6) break;
            fonte -= 0.25;
        } while (fonte >= 6);
        if (linhas.length > maxLinhas) {
            linhas = linhas.slice(0, maxLinhas);
            let ultima = linhas[maxLinhas - 1];
            while (doc.getTextWidth(`${ultima}...`) > largura) ultima = ultima.slice(0, -1);
            linhas[maxLinhas - 1] = `${ultima}...`;
        }
        doc.text(linhas, x, y, { lineHeightFactor: 1.1 });
    }
    function fundo(nome, cabecalho = true) {
        doc.addImage(fundos[nome], 'JPEG', 0, 0, LARGURA, ALTURA);
        if (cabecalho) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(...VERDE);
            doc.text(numero, 553, 60, { align: 'right' });
        }
    }
    fundo('capa', false);
    escrever(`Emitido em Canoas/RS, ${extensa}`, 374, 58, 180, 7);
    escrever(`PROGEAB - PROPOSTA COMERCIAL ${numero}`, 66, 129, 410, 8, true);
    escrever(`Fornecimento de materiais hospitalares para ${proposta.cliente.nome}, com preços garantidos, estoque reservado e acompanhamento mensal.`, 66, 195, 465, 11, false, 2);
    escrever(`Proposta válida até ${proposta.validade.toLocaleDateString('pt-BR')}`, 77, 246, 140, 8, true);
    escrever(moeda(proposta.totalProdutos), 55, 333, 101, 15, true);
    escrever(`${proposta.itens.length} itens contratados`, 55, 349, 101, 8);
    escrever(moeda(proposta.totalProdutos * 6), 185, 333, 101, 15, true);
    const cliente = proposta.cliente;
    escrever(cliente.nome, 56, 449, 229, 9);
    escrever([cliente.nomeFantasia, cliente.cnpj].filter(Boolean).join(' - '), 56, 485, 229, 9);
    escrever([cliente.cidade, cliente.uf].filter(Boolean).join('/'), 56, 521, 229, 9);
    const end = proposta.enderecoEntrega || {};
    const endereco = [
        [end.tipoLogradouro, end.logradouro, end.numero].filter(Boolean).join(' '),
        end.complemento, end.bairro,
        [end.cidade, end.uf].filter(Boolean).join('/'), end.cep
    ].filter(Boolean).join(' - ');
    escrever(endereco, 56, 555, 229, 8, false, 2);
    escrever([cliente.contato, cliente.telefone].filter(Boolean).join(' - '), 56, 593, 229, 9);
    escrever(cliente.email, 56, 607, 229, 9);

    doc.addPage();
    fundo('itens');
    autoTable(doc, {
        startY: 278,
        margin: { top: 100, bottom: 53, left: 42, right: 42 },
        tableWidth: 511.5,
        head: [['Código', 'Marca', 'Descrição', 'Ref. fabr.', 'UM', 'Vlr. unit. (R$)', 'Qtd. mensal', 'Total mensal (R$)']],
        body: proposta.itens.map(item => [item.codigo, texto(item.marca), item.descricao,
            texto(item.referenciaFabricante), texto(item.unidadeMedida),
            item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
            item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 4 }),
            item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]),
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 8, textColor: VERDE, cellPadding: 6, minCellHeight: 24, overflow: 'linebreak', lineWidth: 0 },
        headStyles: { fillColor: VERDE, textColor: 255, fontSize: 7, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [235, 244, 235] },
        columnStyles: { 0: { cellWidth: 37 }, 1: { cellWidth: 35 }, 2: { cellWidth: 174 },
            3: { cellWidth: 45 }, 4: { cellWidth: 25 }, 5: { cellWidth: 65, halign: 'right' },
            6: { cellWidth: 57, halign: 'right' }, 7: { cellWidth: 73.5, halign: 'right' } },
        willDrawPage: data => { if (data.pageNumber > 1) fundo('continuacao'); }
    });
    let y = doc.lastAutoTable.finalY + 10;
    // Totais e benefícios formam um bloco indivisível, fora da tabela de itens.
    if (y + 250 > 789) {
        doc.addPage();
        fundo('continuacao');
        y = 105;
    }
    y = Math.max(y, doc.getNumberOfPages() === 2 ? 454 : 105);
    doc.setFillColor(235, 244, 235);
    doc.roundedRect(324, y, 229, 57, 7, 7, 'F');
    escrever('Total mensal', 335, y + 19, 102, 9);
    escrever('Total estimado na vigência (6 meses)', 335, y + 45, 145, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(moeda(proposta.totalProdutos), 542, y + 19, { align: 'right' });
    doc.text(moeda(proposta.totalProdutos * 6), 542, y + 45, { align: 'right' });
    doc.addImage(fundos.beneficios, 'JPEG', 42, y + 65, 512, 170);

    doc.addPage();
    fundo('condicoes');
    doc.addPage();
    fundo('assinaturas');
    escrever(`Canoas/RS, ${extensa}.`, 42, 179, 350, 9, true);
    escrever(cliente.contato, 135, 290, 140, 9);
    escrever(cliente.nome, 135, 332, 140, 9);

    const paginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= paginas; pagina += 1) {
        doc.setPage(pagina);
        doc.setTextColor(100, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Página ${pagina} de ${paginas}`, 553, 816, { align: 'right' });
    }
    return doc;
}

export async function gerarContratoPdf(proposta) {
    const urls = { capa, itens, condicoes, assinaturas, continuacao, beneficios };
    const fundos = Object.fromEntries(await Promise.all(Object.entries(urls).map(async ([nome, url]) => {
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error('Não foi possível carregar o modelo do contrato.');
        return [nome, new Uint8Array(await resposta.arrayBuffer())];
    })));
    const doc = criarContratoPdf(proposta, fundos);
    baixarBlob(doc.output('blob'), nomeArquivoProposta(proposta, 'pdf').replace(/^Proposta_/, 'Contrato_'));
}
