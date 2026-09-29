"""Rebuild the supplied supporting PDF from reviewed Markdown sources."""
from pathlib import Path
import re
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/documents/supporting-documentation-20260928.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Body', fontName='Helvetica', fontSize=10, leading=13, spaceAfter=8, textColor=HexColor('#203040')))
styles['Heading1'].fontSize = 24
styles['Heading1'].leading = 29
styles['Heading1'].textColor = HexColor('#123b50')
styles['Heading2'].fontSize = 15
styles['Heading2'].leading = 20
styles['Heading2'].spaceBefore = 14
styles['Heading2'].textColor = HexColor('#123b50')
styles['Heading1'].keepWithNext = True
styles['Heading2'].keepWithNext = True
flow = []
for index, name in enumerate(['SPECIFICATION_AUDIT.md', 'IMPLEMENTATION.md', 'OPERATIONS.md', 'API.md']):
    if index: flow.append(PageBreak())
    for paragraph in (ROOT / 'docs' / name).read_text(encoding='utf-8').split('\n\n'):
        paragraph = paragraph.strip()
        if not paragraph: continue
        style = 'Heading2' if paragraph.startswith('## ') else 'Heading1' if paragraph.startswith('# ') else 'Body'
        text = paragraph.removeprefix('## ').removeprefix('# ')
        text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1 (\2)', text)
        flow.append(Paragraph(escape(text).replace('\n', '<br/>'), styles[style]))

def footer(page: canvas.Canvas, doc):
    page.saveState()
    page.setFont('Helvetica', 8)
    page.setFillColor(HexColor('#64748b'))
    page.drawString(44, 27, 'Moskollektor | Supporting documentation | 28 September 2026')
    page.drawRightString(551, 27, str(doc.page))
    page.restoreState()

SimpleDocTemplate(str(OUT), leftMargin=44, rightMargin=44, topMargin=44, bottomMargin=48,
    title='Moskollektor - Supporting documentation', author='Project implementation').build(flow, onFirstPage=footer, onLaterPages=footer)
print(OUT)
