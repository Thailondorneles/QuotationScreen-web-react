import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { baixarBlob, sanitizarNomeArquivo } from '../proposta/propostaDownloadService';
import { EMPRESA_PROPOSTA } from '../../config/propostaConfig';
import { numeroAcordo, validarItensAcordo } from '../../domain/demandaContratos/acordo';

const texto = valor => String(valor ?? '').trim() || 'Não informado';
const valor = numero => Number(numero).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function criarPdfAcordo({ cliente, consultor, itens, mostrarPrecos = true, emissao = new Date() }) {
    if (!validarItensAcordo(itens)) throw new Error('Confira as quantidades, preços e descrições dos itens.');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const azul = [27, 58, 107], laranja = [243, 156, 18], verde = [0, 153, 93];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...verde);
    doc.text('Distribuidora', 16, 17); doc.setFont('helvetica', 'normal'); doc.text('Hospitalar', 16, 22);
    doc.setDrawColor(...verde); doc.roundedRect(16, 25, 24, 11, 2, 2); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Unimed', 28, 31, { align: 'center' });
    doc.setFontSize(4.2); doc.text('CENTRAL DE SERVIÇOS-RS', 28, 34.2, { align: 'center' });
    doc.setFontSize(17); doc.setTextColor(...azul); doc.text('ITENS PARA POSSÍVEL ACORDO', 120, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setTextColor(90); doc.setFontSize(8.5);
    doc.text('Distribuidora Hospitalar | Unimed Central de Serviços-RS', 120, 27, { align: 'center' });
    doc.setFont('helvetica', 'italic'); doc.text('Documento informativo, sem valor de proposta', 120, 32, { align: 'center' });
    doc.setDrawColor(...laranja); doc.setLineWidth(.7); doc.line(16, 40, 194, 40);
    const cadastro = [`Razão social: ${texto(cliente.des_pessoa)}`, `CNPJ: ${texto(cliente.cnpj || cliente.num_cnpj_cpf)}`,
        `Cidade/UF: ${texto([cliente.des_cidade, cliente.cod_uf].filter(Boolean).join(' / '))}`,
        `Contato: ${texto(cliente.des_contato)}`, `E-mail: ${texto(cliente.email || cliente.des_email)}`].join('\n');
    const atendimento = [`Consultor: ${texto(consultor.nome)}`, `E-mail: ${texto(consultor.email)}`, `Telefone: ${texto(consultor.telefone || EMPRESA_PROPOSTA.telefone)}`,
        `Representante: ${texto(consultor.representante)}`, `Data: ${emissao.toLocaleDateString('pt-BR')}`].join('\n');
    autoTable(doc, { startY: 44, margin: { left: 16, right: 16, bottom: 18 },
        head: [['CLIENTE', 'DISTRIBUIDORA HOSPITALAR UNIMED']], body: [[cadastro, atendimento]],
        styles: { fontSize: 8.3, cellPadding: 3, lineWidth: .2, lineColor: [215, 222, 230], valign: 'top' },
        headStyles: { fillColor: [236, 241, 246], textColor: laranja }, bodyStyles: { fillColor: [236, 241, 246], textColor: [40, 40, 40] },
        columnStyles: { 0: { cellWidth: 89 }, 1: { cellWidth: 89 } } });
    let y = doc.lastAutoTable.finalY + 7;
    doc.setFillColor(...azul); doc.rect(16, y, 178, 7, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('OPORTUNIDADE DE ACORDO', 20, y + 4.9);
    y += 12; doc.setTextColor(40); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const introducao = doc.splitTextToSize(`A partir do histórico de compras de ${texto(cliente.des_pessoa)}, identificamos os itens abaixo com consumo recorrente e potencial para inclusão em um Termo de Acordo Comercial com a Distribuidora Hospitalar Unimed. As quantidades mensais são estimativas com base no consumo dos últimos meses. As condições finais, incluindo preços, vigência e prazo de pagamento, serão formalizadas em proposta oficial.`, 178);
    doc.text(introducao, 16, y); y += introducao.length * 3.8 + 4;
    const head = ['Código', 'Marca', 'Descrição', 'Qtd.\nmensal'];
    if (mostrarPrecos) head.push('Vlr. unit.', 'Vlr. total');
    const total = itens.reduce((s, item) => s + numeroAcordo(item.quantidade) * numeroAcordo(item.preco), 0);
    autoTable(doc, { startY: y, margin: { left: 16, right: 16, top: 18, bottom: 18 }, head: [head],
        body: itens.map(item => {
            const linha = [item.codigo, item.marca, item.descricao, numeroAcordo(item.quantidade).toLocaleString('pt-BR')];
            if (mostrarPrecos) linha.push(valor(numeroAcordo(item.preco)), valor(numeroAcordo(item.quantidade) * numeroAcordo(item.preco)));
            return linha;
        }),
        ...(mostrarPrecos ? { foot: [[{ content: 'TOTAL MENSAL ESTIMADO', colSpan: 5 }, `R$ ${valor(total)}`]], showFoot: 'lastPage' } : {}),
        styles: { fontSize: 8, cellPadding: 1.8, textColor: [40, 40, 40], lineColor: [225, 230, 236], lineWidth: .2, overflow: 'linebreak' },
        headStyles: { fillColor: azul, textColor: [255, 255, 255], halign: 'center' }, alternateRowStyles: { fillColor: [247, 249, 251] },
        footStyles: { fillColor: [253, 235, 208], textColor: azul, halign: 'right' },
        columnStyles: mostrarPrecos ? { 0: { cellWidth: 18 }, 1: { cellWidth: 28 }, 2: { cellWidth: 66 }, 3: { cellWidth: 18, halign: 'right' }, 4: { cellWidth: 23, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' } }
            : { 0: { cellWidth: 20 }, 1: { cellWidth: 32 }, 2: { cellWidth: 102 }, 3: { cellWidth: 24, halign: 'right' } }
    });
    const nota = 'Este documento não constitui proposta comercial nem compromisso de fornecimento. Havendo interesse, a Distribuidora Hospitalar Unimed enviará a proposta oficial para formalização do acordo.';
    doc.setFontSize(8.3); const linhas = doc.splitTextToSize(nota, 170); const altura = linhas.length * 3.8 + 6;
    y = doc.lastAutoTable.finalY + 8; if (y + altura > 277) { doc.addPage(); y = 20; }
    doc.setFillColor(254, 244, 226); doc.setDrawColor(...laranja); doc.rect(16, y, 178, altura, 'FD'); doc.setTextColor(176, 96, 12); doc.text(linhas, 20, y + 5);
    for (let pagina = 1; pagina <= doc.getNumberOfPages(); pagina++) {
        doc.setPage(pagina); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150);
        doc.text(`Distribuidora Hospitalar Unimed — Itens para possível acordo · ${pagina}/${doc.getNumberOfPages()}`, 105, 289, { align: 'center' });
    }
    return doc;
}

export function baixarPdfAcordo(dados) {
    const doc = criarPdfAcordo(dados);
    const emissao = dados.emissao || new Date();
    const nome = `Itens_possivel_acordo_${dados.cliente.cod_pessoa}_${sanitizarNomeArquivo(dados.cliente.des_pessoa).slice(0, 35)}_${emissao.toISOString().slice(0, 10)}.pdf`;
    baixarBlob(doc.output('blob'), nome);
}
