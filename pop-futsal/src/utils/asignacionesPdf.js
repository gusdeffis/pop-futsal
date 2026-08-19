import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const AZUL = rgb(0.05, 0.12, 0.31);
const NEGRO = rgb(0, 0, 0);
const GRIS_LINEA = rgb(0.6, 0.6, 0.6);
const MARGEN = 30;
const ANCHO_PAGINA = 595.28; // A4 vertical
const ALTO_PAGINA = 841.89;

const COLUMNAS = [
  { titulo: 'N°', ancho: 30, valor: p => p.partido_nro || '' },
  { titulo: 'Local', ancho: 90, valor: p => p.local },
  { titulo: 'Visitante', ancho: 90, valor: p => p.visitante },
  { titulo: 'Fecha', ancho: 60, valor: p => p.dia || '' },
  { titulo: 'Hora', ancho: 40, valor: p => p.hora || '' },
  { titulo: 'Estadio', ancho: 90, valor: p => p.estadio || '' },
  { titulo: 'Oficial', ancho: 95, valor: p => p.oficial_asignado || '' },
];

export function nombreArchivoAsignaciones() {
  return 'Partidos_Asignados.pdf';
}

export async function generarPDFAsignaciones(partidos) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
  let y = ALTO_PAGINA - MARGEN;

  const texto = (str, x, yPos, tamaño, negrita, color) => {
    page.drawText(String(str ?? ''), { x, y: yPos, size: tamaño, font: negrita ? fontBold : fontRegular, color: color || NEGRO });
  };

  texto('Partidos Asignados — AFA Futsal', MARGEN, y, 15, true, AZUL);
  const fecha = new Date();
  texto(`Generado: ${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`, ANCHO_PAGINA - MARGEN - 110, y, 9, false, GRIS_LINEA);
  y -= 24;

  const anchoTotal = COLUMNAS.reduce((s, c) => s + c.ancho, 0);
  const alturaFila = 18;

  const dibujarEncabezados = () => {
    page.drawRectangle({ x: MARGEN, y: y - 4, width: anchoTotal, height: alturaFila, color: rgb(0.9, 0.93, 0.98) });
    let x = MARGEN;
    COLUMNAS.forEach(c => {
      texto(c.titulo, x + 3, y, 8, true, AZUL);
      x += c.ancho;
    });
    y -= alturaFila;
    page.drawLine({ start: { x: MARGEN, y }, end: { x: MARGEN + anchoTotal, y }, thickness: 0.5, color: GRIS_LINEA });
  };

  dibujarEncabezados();

  partidos.forEach(p => {
    if (y - alturaFila < MARGEN) {
      page = pdfDoc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
      y = ALTO_PAGINA - MARGEN;
      dibujarEncabezados();
    }
    let x = MARGEN;
    COLUMNAS.forEach(c => {
      texto(String(c.valor(p) ?? ''), x + 3, y - alturaFila + 5, 8, false, NEGRO);
      x += c.ancho;
    });
    y -= alturaFila;
    page.drawLine({ start: { x: MARGEN, y }, end: { x: MARGEN + anchoTotal, y }, thickness: 0.3, color: GRIS_LINEA });
  });

  const fontFooter = await pdfDoc.embedFont(StandardFonts.Helvetica);
  pdfDoc.getPages().forEach(pagina => {
    const t = '© Gustavo Deffis — POP Futsal AFA';
    const ancho = fontFooter.widthOfTextAtSize(t, 7);
    pagina.drawText(t, { x: (ANCHO_PAGINA - ancho) / 2, y: 12, size: 7, font: fontFooter, color: rgb(0.65, 0.65, 0.65) });
  });

  const bytes = await pdfDoc.save();
  return { bytes, nombreSugerido: nombreArchivoAsignaciones() };
}
