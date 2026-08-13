import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const AZUL = rgb(0.05, 0.12, 0.31);
const NEGRO = rgb(0, 0, 0);
const GRIS_LINEA = rgb(0.6, 0.6, 0.6);
const MARGEN = 30;
const GAP_CENTRAL = 20; // separación entre el tablero de la izquierda y el de la derecha
const ANCHO_PAGINA = 841.89; // A4 horizontal
const ALTO_PAGINA = 595.28;
const ANCHO_MITAD = (ANCHO_PAGINA - MARGEN * 2 - GAP_CENTRAL) / 2;

export function nombreArchivoTableros() {
  return 'Tableros_Informes.pdf';
}

// Columnas de cada tablero, ya angostadas para que las dos entren lado a
// lado en una misma hoja apaisada (cada juego de columnas suma ~ANCHO_MITAD).
const COLUMNAS_DEMORAS = [
  { titulo: 'Club', ancho: 90, valor: f => f.club },
  { titulo: 'PJ', ancho: 32, valor: f => f.partidos },
  { titulo: 'C/Dem', ancho: 48, valor: f => f.demoraInicio.partidosConDemora },
  { titulo: '%', ancho: 35, valor: f => `${f.demoraInicio.porcentaje}%` },
  { titulo: 'Min.Pr', ancho: 45, valor: f => f.demoraInicio.minutosPromedio },
  { titulo: 'C/Exc', ancho: 40, valor: f => f.entretiempos.cantidadExcedidos },
  { titulo: 'Min.ET', ancho: 40, valor: f => f.entretiempos.promedioMin },
];

const COLUMNAS_INCIDENTES = [
  { titulo: 'Club', ancho: 90, valor: f => f.club },
  { titulo: 'PJ', ancho: 32, valor: f => f.partidos },
  { titulo: 'Inc.', ancho: 45, valor: f => f.incidentes },
  { titulo: 'Obs.Inst', ancho: 60, valor: f => f.obsInstalaciones },
  { titulo: 'Pla.FT', ancho: 60, valor: f => f.controlesPrevios.planillaFueraTermino },
  { titulo: 'Cam.S/A', ancho: 65, valor: f => f.controlesPrevios.camisetaSinApellido },
];

export async function generarPDFTableros(porClub, total, opciones = {}) {
  const { fecha = new Date() } = opciones;
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
  let y = ALTO_PAGINA - MARGEN;

  const nuevaPagina = () => {
    page = pdfDoc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
    y = ALTO_PAGINA - MARGEN;
  };

  const texto = (str, x, yPos, tamaño, negrita, color) => {
    page.drawText(String(str ?? ''), { x, y: yPos, size: tamaño, font: negrita ? fontBold : fontRegular, color: color || NEGRO });
  };

  const fechaTexto = fecha instanceof Date
    ? `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`
    : String(fecha);

  texto('Tablero de Informes — AFA Futsal', MARGEN, y, 16, true, AZUL);
  texto(`Generado: ${fechaTexto}`, ANCHO_PAGINA - MARGEN - 120, y, 10, false, GRIS_LINEA);
  y -= 26;

  const xIzq = MARGEN;
  const xDer = MARGEN + ANCHO_MITAD + GAP_CENTRAL;
  const anchoIzq = COLUMNAS_DEMORAS.reduce((s, c) => s + c.ancho, 0);
  const anchoDer = COLUMNAS_INCIDENTES.reduce((s, c) => s + c.ancho, 0);

  // Títulos de cada tablero, uno a la izquierda y otro a la derecha.
  texto('Tablero de Demora en Inicio y Entretiempos', xIzq, y, 11, true, AZUL);
  texto('Tablero de Incidentes y Controles Previos', xDer, y, 11, true, AZUL);
  y -= 18;

  const alturaFila = 16;

  const dibujarEncabezados = () => {
    [[xIzq, anchoIzq, COLUMNAS_DEMORAS], [xDer, anchoDer, COLUMNAS_INCIDENTES]].forEach(([xBase, anchoTotal, columnas]) => {
      page.drawRectangle({ x: xBase, y: y - 4, width: anchoTotal, height: alturaFila, color: rgb(0.9, 0.93, 0.98) });
      let x = xBase;
      columnas.forEach(c => {
        texto(c.titulo, x + 3, y, 8, true, AZUL);
        x += c.ancho;
      });
    });
    y -= alturaFila;
    page.drawLine({ start: { x: xIzq, y }, end: { x: xIzq + anchoIzq, y }, thickness: 0.5, color: GRIS_LINEA });
    page.drawLine({ start: { x: xDer, y }, end: { x: xDer + anchoDer, y }, thickness: 0.5, color: GRIS_LINEA });
  };

  dibujarEncabezados();

  // Como las dos tablas comparten exactamente las mismas filas (los mismos
  // clubes + TOTAL), se dibujan sincronizadas con un solo cursor vertical.
  const dibujarFilaDoble = (filaIzq, filaDer, esTotal) => {
    if (y - alturaFila < MARGEN) { nuevaPagina(); dibujarEncabezados(); }
    [[xIzq, anchoIzq, COLUMNAS_DEMORAS, filaIzq], [xDer, anchoDer, COLUMNAS_INCIDENTES, filaDer]].forEach(([xBase, anchoTotal, columnas, fila]) => {
      if (esTotal) page.drawRectangle({ x: xBase, y: y - alturaFila + 2, width: anchoTotal, height: alturaFila, color: rgb(0.78, 0.86, 0.96) });
      let x = xBase;
      columnas.forEach(c => {
        texto(String(c.valor(fila) ?? ''), x + 3, y - alturaFila + 5, 8, esTotal, NEGRO);
        x += c.ancho;
      });
    });
    y -= alturaFila;
    page.drawLine({ start: { x: xIzq, y }, end: { x: xIzq + anchoIzq, y }, thickness: 0.3, color: GRIS_LINEA });
    page.drawLine({ start: { x: xDer, y }, end: { x: xDer + anchoDer, y }, thickness: 0.3, color: GRIS_LINEA });
  };

  porClub.forEach(f => dibujarFilaDoble(f, f, false));
  if (total) dibujarFilaDoble(total, total, true);

  // Crédito sutil del creador de la app, en cada página.
  const fontFooter = await pdfDoc.embedFont(StandardFonts.Helvetica);
  pdfDoc.getPages().forEach(pagina => {
    const t = '© Gustavo Deffis — POP Futsal AFA';
    const ancho = fontFooter.widthOfTextAtSize(t, 7);
    pagina.drawText(t, { x: (ANCHO_PAGINA - ancho) / 2, y: 12, size: 7, font: fontFooter, color: rgb(0.65, 0.65, 0.65) });
  });

  const bytes = await pdfDoc.save();
  return { bytes, nombreSugerido: nombreArchivoTableros() };
}
