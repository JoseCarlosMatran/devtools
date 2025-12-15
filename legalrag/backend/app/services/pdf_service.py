"""
Servicio de Generación de PDFs.
Genera informes profesionales listos para juicio.
"""
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
import uuid

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, HRFlowable
)
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT

from app.core.config import settings
from app.models.case import Case, CaseAnalysis

logger = logging.getLogger(__name__)


class PDFService:
    """
    Servicio de generación de PDFs profesionales.
    Genera informes de análisis y plantillas legales.
    """

    def __init__(self):
        self.export_dir = Path(settings.export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self._init_styles()

    def _init_styles(self):
        """Inicializa estilos de documento."""
        self.styles = getSampleStyleSheet()

        # Título principal
        self.styles.add(ParagraphStyle(
            name='MainTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1a365d')
        ))

        # Subtítulo
        self.styles.add(ParagraphStyle(
            name='SubTitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=10,
            textColor=colors.HexColor('#2c5282')
        ))

        # Sección
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=12,
            spaceBefore=12,
            spaceAfter=6,
            textColor=colors.HexColor('#2d3748'),
            borderWidth=1,
            borderColor=colors.HexColor('#e2e8f0'),
            borderPadding=5
        ))

        # Texto normal justificado
        self.styles.add(ParagraphStyle(
            name='JustifiedBody',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            spaceBefore=4,
            spaceAfter=4,
            leading=14
        ))

        # Cita jurisprudencial
        self.styles.add(ParagraphStyle(
            name='LegalCitation',
            parent=self.styles['Normal'],
            fontSize=9,
            leftIndent=20,
            rightIndent=20,
            spaceBefore=6,
            spaceAfter=6,
            textColor=colors.HexColor('#4a5568'),
            backColor=colors.HexColor('#f7fafc'),
            borderWidth=1,
            borderColor=colors.HexColor('#e2e8f0'),
            borderPadding=8
        ))

        # Advertencia/Riesgo
        self.styles.add(ParagraphStyle(
            name='Warning',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#c53030'),
            backColor=colors.HexColor('#fff5f5'),
            borderWidth=1,
            borderColor=colors.HexColor('#fc8181'),
            borderPadding=8,
            spaceBefore=6,
            spaceAfter=6
        ))

    def _header_footer(self, canvas, doc):
        """Añade cabecera y pie de página."""
        canvas.saveState()

        # Cabecera
        canvas.setFont('Helvetica-Bold', 9)
        canvas.setFillColor(colors.HexColor('#1a365d'))
        canvas.drawString(2*cm, A4[1] - 1.5*cm, "LegalRAG - Informe de Análisis Jurídico")

        # Línea separadora cabecera
        canvas.setStrokeColor(colors.HexColor('#e2e8f0'))
        canvas.line(2*cm, A4[1] - 1.8*cm, A4[0] - 2*cm, A4[1] - 1.8*cm)

        # Pie de página
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#718096'))
        canvas.drawString(2*cm, 1.5*cm, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        canvas.drawRightString(A4[0] - 2*cm, 1.5*cm, f"Página {doc.page}")

        # Línea separadora pie
        canvas.line(2*cm, 1.8*cm, A4[0] - 2*cm, 1.8*cm)

        # Disclaimer
        canvas.setFont('Helvetica-Oblique', 7)
        canvas.drawCentredString(A4[0]/2, 1*cm, "Este informe es orientativo. Requiere validación por abogado colegiado.")

        canvas.restoreState()

    async def generate_analysis_report(
        self,
        caso: Case,
        analysis: CaseAnalysis,
        include_jurisprudencia: bool = True
    ) -> str:
        """
        Genera PDF de informe de análisis completo.
        Retorna ruta del archivo generado.
        """
        filename = f"informe_{caso.referencia}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = self.export_dir / filename

        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2.5*cm,
            bottomMargin=2.5*cm
        )

        story = []

        # PORTADA
        story.append(Spacer(1, 2*cm))
        story.append(Paragraph("INFORME DE ANÁLISIS JURÍDICO", self.styles['MainTitle']))
        story.append(Spacer(1, 1*cm))

        # Datos del caso
        caso_data = [
            ["Referencia:", caso.referencia],
            ["Asunto:", caso.titulo],
            ["Tipo:", caso.tipo_caso.value.replace("_", " ").title()],
            ["Posición:", caso.rol_cliente.value.replace("_", " ").title()],
            ["Juzgado:", caso.juzgado or "No especificado"],
            ["Nº Procedimiento:", caso.numero_procedimiento or "No especificado"],
        ]

        tabla_caso = Table(caso_data, colWidths=[4*cm, 12*cm])
        tabla_caso.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
            ('FONT', (1, 0), (1, -1), 'Helvetica', 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2d3748')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(tabla_caso)
        story.append(PageBreak())

        # RESUMEN EJECUTIVO
        story.append(Paragraph("1. RESUMEN EJECUTIVO", self.styles['SubTitle']))
        story.append(HRFlowable(width="100%", color=colors.HexColor('#e2e8f0')))
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(analysis.resumen_ejecutivo, self.styles['JustifiedBody']))
        story.append(Spacer(1, 0.5*cm))

        # HECHOS RELEVANTES
        if analysis.hechos_relevantes:
            story.append(Paragraph("2. HECHOS RELEVANTES", self.styles['SubTitle']))
            story.append(HRFlowable(width="100%", color=colors.HexColor('#e2e8f0')))

            for i, hecho in enumerate(analysis.hechos_relevantes, 1):
                relevancia_color = {
                    'alta': '#c53030',
                    'media': '#d69e2e',
                    'baja': '#38a169'
                }.get(hecho.get('relevancia', 'media'), '#718096')

                texto = f"<b>{i}.</b> {hecho.get('descripcion', '')} "
                texto += f"<font color='{relevancia_color}'>[{hecho.get('relevancia', '').upper()}]</font>"
                if hecho.get('fuente_documento'):
                    texto += f" <i>(Fuente: {hecho.get('fuente_documento')})</i>"

                story.append(Paragraph(texto, self.styles['JustifiedBody']))
            story.append(Spacer(1, 0.5*cm))

        # PROBLEMAS JURÍDICOS
        if analysis.problemas_juridicos:
            story.append(Paragraph("3. PROBLEMAS JURÍDICOS IDENTIFICADOS", self.styles['SubTitle']))
            story.append(HRFlowable(width="100%", color=colors.HexColor('#e2e8f0')))

            for i, problema in enumerate(analysis.problemas_juridicos, 1):
                texto = f"<b>{i}. [{problema.get('tipo', 'general').upper()}]</b> {problema.get('descripcion', '')}"
                story.append(Paragraph(texto, self.styles['JustifiedBody']))

                if problema.get('normas_relacionadas'):
                    normas = ", ".join(problema.get('normas_relacionadas', []))
                    story.append(Paragraph(f"<i>Normas: {normas}</i>", self.styles['JustifiedBody']))
            story.append(Spacer(1, 0.5*cm))

        # NORMATIVA APLICABLE
        if analysis.normativa_aplicable:
            story.append(Paragraph("4. NORMATIVA APLICABLE", self.styles['SubTitle']))
            story.append(HRFlowable(width="100%", color=colors.HexColor('#e2e8f0')))

            for norma in analysis.normativa_aplicable:
                texto = f"<b>{norma.get('norma', '')}</b>"
                if norma.get('articulos'):
                    texto += f" - Arts. {', '.join(norma.get('articulos', []))}"
                story.append(Paragraph(texto, self.styles['SectionHeader']))
                story.append(Paragraph(norma.get('aplicacion', ''), self.styles['JustifiedBody']))
            story.append(Spacer(1, 0.5*cm))

        # JURISPRUDENCIA
        if include_jurisprudencia and analysis.jurisprudencia_relevante:
            story.append(PageBreak())
            story.append(Paragraph("5. JURISPRUDENCIA RELEVANTE", self.styles['SubTitle']))
            story.append(HRFlowable(width="100%", color=colors.HexColor('#e2e8f0')))

            for jur in analysis.jurisprudencia_relevante:
                header = f"<b>{jur.get('identificador', '')}</b> - {jur.get('tribunal', '')} ({jur.get('fecha', '')})"
                story.append(Paragraph(header, self.styles['SectionHeader']))
                story.append(Paragraph(f"<i>\"{jur.get('extracto', '')}\"</i>", self.styles['LegalCitation']))
                story.append(Paragraph(f"<b>Aplicación al caso:</b> {jur.get('aplicacion_caso', '')}", self.styles['JustifiedBody']))
            story.append(Spacer(1, 0.5*cm))

        # ESTRATEGIA
        story.append(PageBreak())
        story.append(Paragraph("6. ESTRATEGIA JURÍDICA", self.styles['SubTitle']))
        story.append(HRFlowable(width="100%", color=colors.HexColor('#e2e8f0')))

        if analysis.estrategia_defensa:
            story.append(Paragraph("<b>Estrategia de Defensa:</b>", self.styles['SectionHeader']))
            story.append(Paragraph(analysis.estrategia_defensa, self.styles['JustifiedBody']))

        if analysis.estrategia_ataque:
            story.append(Paragraph("<b>Estrategia de Ataque:</b>", self.styles['SectionHeader']))
            story.append(Paragraph(analysis.estrategia_ataque, self.styles['JustifiedBody']))

        # ARGUMENTOS PRINCIPALES
        if analysis.argumentos_principales:
            story.append(Spacer(1, 0.5*cm))
            story.append(Paragraph("7. ARGUMENTOS PARA JUICIO", self.styles['SubTitle']))
            story.append(HRFlowable(width="100%", color=colors.HexColor('#e2e8f0')))

            for i, arg in enumerate(analysis.argumentos_principales, 1):
                fuerza_icon = {'fuerte': '●●●', 'moderado': '●●○', 'débil': '●○○'}.get(
                    arg.get('fuerza', ''), '●●○'
                )
                story.append(Paragraph(
                    f"<b>Argumento {i}: {arg.get('titulo', '')}</b> [{fuerza_icon}]",
                    self.styles['SectionHeader']
                ))
                story.append(Paragraph(arg.get('desarrollo', ''), self.styles['JustifiedBody']))
                story.append(Paragraph(
                    f"<i>Fundamento: {arg.get('fundamento_legal', '')}</i>",
                    self.styles['JustifiedBody']
                ))

        # RIESGOS Y PUNTOS DÉBILES
        story.append(PageBreak())
        story.append(Paragraph("8. ANÁLISIS DE RIESGOS", self.styles['SubTitle']))
        story.append(HRFlowable(width="100%", color=colors.HexColor('#e2e8f0')))

        if analysis.riesgos:
            for riesgo in analysis.riesgos:
                texto = f"<b>[{riesgo.get('gravedad', 'media').upper()}]</b> {riesgo.get('descripcion', '')}"
                story.append(Paragraph(texto, self.styles['Warning']))
                if riesgo.get('mitigacion'):
                    story.append(Paragraph(f"<i>Mitigación: {riesgo.get('mitigacion')}</i>", self.styles['JustifiedBody']))

        if analysis.puntos_debiles:
            story.append(Paragraph("<b>Puntos Débiles:</b>", self.styles['SectionHeader']))
            items = [ListItem(Paragraph(p, self.styles['JustifiedBody'])) for p in analysis.puntos_debiles]
            story.append(ListFlowable(items, bulletType='bullet'))

        # RECOMENDACIONES
        if analysis.recomendaciones:
            story.append(Spacer(1, 0.5*cm))
            story.append(Paragraph("9. RECOMENDACIONES", self.styles['SubTitle']))
            story.append(HRFlowable(width="100%", color=colors.HexColor('#e2e8f0')))

            for i, rec in enumerate(analysis.recomendaciones, 1):
                story.append(Paragraph(f"<b>{i}.</b> {rec}", self.styles['JustifiedBody']))

        # Generar PDF
        doc.build(story, onFirstPage=self._header_footer, onLaterPages=self._header_footer)

        logger.info(f"PDF generado: {filepath}")
        return str(filepath)

    async def generate_argument_template(
        self,
        caso: Case,
        analysis: CaseAnalysis
    ) -> str:
        """
        Genera plantilla de escrito con argumentos.
        Lista para copiar y adaptar.
        """
        filename = f"argumentos_{caso.referencia}_{datetime.now().strftime('%Y%m%d')}.pdf"
        filepath = self.export_dir / filename

        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=A4,
            rightMargin=2.5*cm,
            leftMargin=2.5*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )

        story = []

        story.append(Paragraph(f"AL JUZGADO {caso.juzgado or '[ESPECIFICAR]'}", self.styles['MainTitle']))
        story.append(Spacer(1, 1*cm))

        # Encabezado procesal
        story.append(Paragraph(
            f"PROCEDIMIENTO: {caso.numero_procedimiento or '[Nº]'}",
            self.styles['JustifiedBody']
        ))
        story.append(Spacer(1, 0.5*cm))

        # Argumentos formateados para escrito
        if analysis.argumentos_principales:
            for i, arg in enumerate(analysis.argumentos_principales, 1):
                story.append(Paragraph(f"<b>{arg.get('titulo', f'ARGUMENTO {i}').upper()}</b>", self.styles['SubTitle']))
                story.append(Paragraph(arg.get('desarrollo', ''), self.styles['JustifiedBody']))
                story.append(Spacer(1, 0.3*cm))

        doc.build(story)
        return str(filepath)
