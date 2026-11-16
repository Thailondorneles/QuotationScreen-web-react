"""Gera fundos sem dados de exemplo: py preparar-modelo-contrato.py original.pdf.

Requer PyMuPDF. Os campos amarelos das cláusulas são parte do modelo fixo.
O PDF gerado no navegador não depende de Python nem do arquivo original.
"""
import sys
from pathlib import Path
import pymupdf as fitz

destino = Path(__file__).resolve().parents[1] / 'src' / 'imagens' / 'contrato'
destino.mkdir(parents=True, exist_ok=True)
pdf = fitz.open(sys.argv[1])
pdf[1].get_pixmap(matrix=fitz.Matrix(2, 2), clip=fitz.Rect(42, 519, 554, 689)).save(str(destino / 'beneficios.jpg'))

def apagar(pagina, retangulo, cor=(1, 1, 1)):
    pagina.draw_rect(fitz.Rect(retangulo), color=None, fill=cor, overlay=True)

for indice, pagina in enumerate(pdf):
    apagar(pagina, (493, 807, 555, 820))
    if indice:
        apagar(pagina, (489, 47, 555, 64))
    else:
        fundo = (237 / 255, 245 / 255, 237 / 255)
        # Cor do painel amostrada do PDF para evitar remendos visíveis.
        pix = pagina.get_pixmap()
        fundo = tuple(c / 255 for c in pix.pixel(50, 180)[:3])
        apagar(pagina, (370, 49, 555, 63))
        apagar(pagina, (65, 119, 480, 132), fundo)
        apagar(pagina, (65, 181, 535, 220), fundo)
        apagar(pagina, (74, 234, 218, 250), (1, 0.49, 0.08))
        apagar(pagina, (54, 316, 156, 353))
        apagar(pagina, (184, 316, 286, 339))
        for rect in [(56, 439, 286, 454), (56, 476, 286, 490),
                     (56, 512, 286, 526), (56, 547, 286, 565),
                     (56, 584, 286, 613)]:
            apagar(pagina, rect)
    if indice == 1:
        apagar(pagina, (41, 277, 555, 700))
    if indice == 3:
        apagar(pagina, (41, 168, 260, 183))
        apagar(pagina, (130, 280, 277, 292))
        apagar(pagina, (130, 322, 277, 335))
    pagina.get_pixmap(matrix=fitz.Matrix(2, 2)).save(str(destino / f'pagina-{indice + 1}.jpg'))

# Cabeçalho e rodapé para páginas adicionais da tabela.
pagina = pdf[1]
apagar(pagina, (40, 90, 556, 790))
pagina.get_pixmap(matrix=fitz.Matrix(2, 2)).save(str(destino / 'continuacao.jpg'))
