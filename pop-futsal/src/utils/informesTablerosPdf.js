import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const AZUL = rgb(0.05, 0.12, 0.31);
const NEGRO = rgb(0, 0, 0);
const GRIS_LINEA = rgb(0.6, 0.6, 0.6);
const MARGEN = 30;
const ANCHO_PAGINA = 841.89; // A4 horizontal — los tableros son anchos, entran mejor apaisados
const ALTO_PAGINA = 595.28;

export function nombreArchivoTableros() {
  return 'Tableros_Informes.pdf';
}

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

  const asegurarEspacio = (alturaNecesaria) => {
    if (y - alturaNecesaria < MARGEN) nuevaPagina();
  };

  const texto = (str, x, tamaño, negrita, color) => {
    page.drawText(String(str ?? ''), { x, y, size: tamaño, font: negrita ? fontBold : fontRegular, color: color || NEGRO });
  };

  const fechaTexto = fecha instanceof Date
    ? `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`
    : String(fecha);

  texto('Tablero de Informes — AFA Futsal', MARGEN, 16, true, AZUL);
  texto(`Generado: ${fechaTexto}`, ANCHO_PAGINA - MARGEN - 120, 10, false, GRIS_LINEA);
  y -= 30;

  const seccion = (titulo) => {
    asegurarEspacio(30);
    texto(titulo, MARGEN, 13, true, AZUL);
    y -= 20;
  };

  const tabla = (columnas, filas, filaTotal) => {
    const anchoTotal = columnas.reduce((s, c) => s + c.ancho, 0);
    const alturaFila = 16;

    const dibujarEncabezado = () => {
      let x = MARGEN;
      page.drawRectangle({ x: MARGEN, y: y - 4, width: anchoTotal, height: alturaFila, color: rgb(0.9, 0.93, 0.98) });
      columnas.forEach(c => {
        texto(c.titulo, x + 3, 9, true, AZUL);
        x += c.ancho;
      });
      y -= alturaFila;
      page.drawLine({ start: { x: MARGEN, y }, end: { x: MARGEN + anchoTotal, y }, thickness: 0.5, color: GRIS_LINEA });
    };

    asegurarEspacio(alturaFila * 2);
    dibujarEncabezado();

    const dibujarFila = (fila, esTotal) => {
      if (y - alturaFila < MARGEN) { nuevaPagina(); dibujarEncabezado(); }
      let x = MARGEN;
      if (esTotal) page.drawRectangle({ x: MARGEN, y: y - alturaFila + 2, width: anchoTotal, height: alturaFila, color: rgb(0.78, 0.86, 0.96) });
      columnas.forEach(c => {
        const valor = c.valor(fila);
        texto(String(valor ?? ''), x + 3, 9, esTotal, NEGRO);
        x += c.ancho;
      });
      y -= alturaFila;
      page.drawLine({ start: { x: MARGEN, y }, end: { x: MARGEN + anchoTotal, y }, thickness: 0.3, color: GRIS_LINEA });
    };

    filas.forEach(f => dibujarFila(f, false));
    if (filaTotal) dibujarFila(filaTotal, true);
    y -= 14;
  };

  // --- Tablero 1: Demora en Inicio y Entretiempos ---
  seccion('Tablero de Demora en Inicio y Entretiempos');
  tabla(
    [
      { titulo: 'Club', ancho: 110, valor: f => f.club },
      { titulo: 'PJ', ancho: 40, valor: f => f.partidos },
      { titulo: 'Con Demora', ancho: 70, valor: f => f.demoraInicio.partidosConDemora },
      { titulo: '%', ancho: 50, valor: f => `${f.demoraInicio.porcentaje}%` },
      { titulo: 'Min. Prom.', ancho: 60, valor: f => f.demoraInicio.minutosPromedio },
      { titulo: 'Cant. Exced.', ancho: 70, valor: f => f.entretiempos.cantidadExcedidos },
      { titulo: 'Min. Prom. ET', ancho: 70, valor: f => f.entretiempos.promedioMin },
    ],
    porClub, total,
  );

  // --- Tablero 2: Incidentes, Instalaciones y Controles Previos ---
  seccion('Tablero de Incidentes, Instalaciones y Controles Previos');
  tabla(
    [
      { titulo: 'Club', ancho: 110, valor: f => f.club },
      { titulo: 'PJ', ancho: 40, valor: f => f.partidos },
      { titulo: 'Incidentes', ancho: 70, valor: f => f.incidentes },
      { titulo: 'Obs. Instalación', ancho: 100, valor: f => f.obsInstalaciones },
      { titulo: 'Planilla F. Término', ancho: 110, valor: f => f.controlesPrevios.planillaFueraTermino },
      { titulo: 'Camiseta S/Apellido', ancho: 110, valor: f => f.controlesPrevios.camisetaSinApellido },
    ],
    porClub, total,
  );

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
