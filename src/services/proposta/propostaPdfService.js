import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { carregarLogoProposta } from './propostaAssetsService.js';
import { baixarBlob, nomeArquivoProposta } from './propostaDownloadService.js';

const VERDE = [0, 132, 74];

function moeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function data(valor) {
    return valor.toLocaleDateString('pt-BR');
}

function enderecoTexto(endereco) {
    const logradouro = [endereco.tipoLogradouro, endereco.logradouro].filter(Boolean).join(' ');
    const linha1 = [logradouro, endereco.numero].filter(Boolean).join(', ');
    const linha2 = [endereco.complemento, endereco.bairro, endereco.cidade, endereco.uf].filter(Boolean).join(' - ');
    return [linha1, linha2, endereco.cep ? `CEP ${endereco.cep}` : '', endereco.referencia ? `Ref.: ${endereco.referencia}` : '']
        .filter(Boolean)
        .join(' | ');
}

function textoOuTraco(valor) {
    return valor === null || valor === undefined || valor === '' ? '-' : String(valor);
}

export async function gerarPropostaPdf(proposta) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logo = await carregarLogoProposta();
    doc.addImage(logo, 'PNG', 14, 10, 42, 21);

    doc.setTextColor(...VERDE);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('PROPOSTA COMERCIAL', 282, 17, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.setFont(undefined, 'normal');
    doc.text(`${proposta.empresa.nome} — Unidade ${proposta.empresa.unidade} (${proposta.empresa.nomeUnidade})`, 282, 23, { align: 'right' });
    doc.text(`CNPJ: ${proposta.empresa.cnpj} | Telefone: ${proposta.empresa.telefone} | ${proposta.empresa.email}`, 282, 28, { align: 'right' });

    doc.setDrawColor(...VERDE);
    doc.line(14, 35, 283, 35);
    doc.setFontSize(10);
    doc.setTextColor(35, 35, 35);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente', 14, 43);
    doc.setFont(undefined, 'normal');
    doc.text(`${proposta.cliente.codigo} - ${proposta.cliente.nome}`, 14, 49);
    doc.text(`CNPJ: ${textoOuTraco(proposta.cliente.cnpj)} | Telefone: ${textoOuTraco(proposta.cliente.telefone)} | E-mail: ${textoOuTraco(proposta.cliente.email)}`, 14, 55);
    doc.text(`Condição de pagamento: ${proposta.condicaoPagamento.codigo} - ${proposta.condicaoPagamento.descricao}`, 14, 61);
    doc.text(`Representante: ${textoOuTraco(proposta.representante.nome)} | Emissão: ${data(proposta.emissao)} | Validade: ${data(proposta.validade)}`, 14, 67);
    if (proposta.ordemCompra) doc.text(`Ordem de compra: ${proposta.ordemCompra}`, 14, 73);
    if (proposta.dataCarga) doc.text(`Data de carga: ${proposta.dataCarga}`, 110, 73);

    const endereco = enderecoTexto(proposta.enderecoEntrega);
    const inicioTabela = endereco ? 84 : proposta.ordemCompra ? 79 : 73;
    if (endereco) {
        doc.setFont(undefined, 'bold');
        doc.text('Endereço de entrega:', 14, proposta.ordemCompra ? 79 : 73);
        doc.setFont(undefined, 'normal');
        doc.text(endereco, 51, proposta.ordemCompra ? 79 : 73, { maxWidth: 230 });
    }

    autoTable(doc, {
        startY: inicioTabela,
        head: [['Seq.', 'Código', 'Descrição', 'Princípio ativo', 'Marca', 'Quantidade', 'Valor unitário', 'Valor total']],
        body: proposta.itens.map(item => [
            item.sequencia,
            item.codigo,
            item.descricao,
            textoOuTraco(item.principioAtivo),
            textoOuTraco(item.marca),
            item.quantidade.toLocaleString('pt-BR'),
            moeda(item.valorUnitario),
            moeda(item.valorTotal)
        ]),
        theme: 'grid',
        headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 20 },
            2: { cellWidth: 72 },
            3: { cellWidth: 50 },
            4: { cellWidth: 32 },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 27, halign: 'right' },
            7: { cellWidth: 27, halign: 'right' }
        },
        didDrawPage: () => {
            const pagina = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(110);
            doc.text(`Página ${pagina}`, 283, 202, { align: 'right' });
        }
    });

    let y = doc.lastAutoTable.finalY + 7;
    if (y > 180) {
        doc.addPage();
        y = 18;
    }
    doc.setFontSize(10);
    doc.setTextColor(35, 35, 35);
    doc.text(`Total dos produtos: ${moeda(proposta.totalProdutos)}`, 283, y, { align: 'right' });
    y += 6;
    if (proposta.frete.cotado) {
        const prazo = proposta.frete.prazo != null ? ` | Prazo: ${proposta.frete.prazo} dia(s)` : '';
        const valorFrete = proposta.frete.valorVisivel ? `Frete: ${moeda(proposta.frete.valor)} | ` : '';
        doc.text(`${valorFrete}Transportadora: ${textoOuTraco(proposta.frete.transportadora)}${prazo}`, 283, y, { align: 'right' });
        y += 6;
    }
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...VERDE);
    doc.setFontSize(12);
    doc.text(`TOTAL DA PROPOSTA: ${moeda(proposta.totalProposta)}`, 283, y, { align: 'right' });
    if (proposta.observacoes.length) {
        y += 8;
        if (y > 185) {
            doc.addPage();
            y = 18;
        }
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text('Observações:', 14, y);
        doc.setFont(undefined, 'normal');
        doc.text(proposta.observacoes.map(observacao => `• ${observacao}`).join('\n'), 14, y + 5, { maxWidth: 210 });
    }

    baixarBlob(doc.output('blob'), nomeArquivoProposta(proposta, 'pdf'));
}
