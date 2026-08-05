import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const AZUL = rgb(0.05, 0.12, 0.31);
const NEGRO = rgb(0, 0, 0);
const GRIS_LINEA = rgb(0.6, 0.6, 0.6);
const MARGEN = 40;
const ANCHO_PAGINA = 595.28; // A4
const ALTO_PAGINA = 841.89;

// Arma el nombre de archivo sugerido para compartir/descargar.
export function nombreArchivoInforme(club) {
  const limpio = String(club || 'club').replace(/[^a-zA-Z0-9]+/g, '_');
  return `Informe_${limpio}.pdf`;
}

export async function generarPDFInformeClub(informe, opciones = {}) {
  const { numero = 1, fecha = new Date(), codigo = '' } = opciones;
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

  const encabezadoPagina = () => {
    texto(`INFORME N°  ${numero}`, MARGEN, 10, true, AZUL);
    const fechaTexto = fecha instanceof Date
      ? `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`
      : String(fecha);
    texto(`FECHA:  ${fechaTexto}`, 240, 10, true, AZUL);
    if (codigo) texto(`Código:  ${codigo}`, ANCHO_PAGINA - MARGEN - 80, 10, false, AZUL);
    y -= 24;
    texto(informe.club, MARGEN, 22, true, NEGRO);
    y -= 34;
  };

  encabezadoPagina();

  const seccion = (titulo) => {
    asegurarEspacio(30);
    texto(`<>  ${titulo}`, MARGEN, 13, true, AZUL);
    y -= 20;
  };

  // Dibuja una tabla simple: encabezados fijos + filas, con salto de página
  // automático si no entra. `columnas` es [{ titulo, ancho, campo }].
  const tabla = (columnas, filas) => {
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

    if (filas.length === 0) {
      asegurarEspacio(alturaFila);
      texto('(sin datos)', MARGEN + 3, 9, false, GRIS_LINEA);
      y -= alturaFila;
      return;
    }

    filas.forEach(fila => {
      if (y - alturaFila < MARGEN) {
        nuevaPagina();
        dibujarEncabezado();
      }
      let x = MARGEN;
      columnas.forEach(c => {
        const valor = fila[c.campo] ?? '';
        texto(String(valor).slice(0, Math.floor(c.ancho / 4.5)), x + 3, 9, false, NEGRO);
        x += c.ancho;
      });
      y -= alturaFila;
      page.drawLine({ start: { x: MARGEN, y }, end: { x: MARGEN + anchoTotal, y }, thickness: 0.3, color: GRIS_LINEA });
    });
    y -= 14;
  };

  // --- Instalaciones ---
  seccion('Instalaciones');
  if (informe.estadio) { texto(`Estadio: ${informe.estadio}`, MARGEN, 10, false, NEGRO); y -= 16; }
  tabla(
    [{ titulo: 'Ítem', ancho: 140, campo: 'item' }, { titulo: 'Fecha', ancho: 60, campo: 'fecha' }, { titulo: 'Observación', ancho: 315, campo: 'observacion' }],
    informe.instalaciones,
  );

  // --- Control de Horarios ---
  seccion('Control de Horarios');
  tabla(
    [
      { titulo: 'Fecha', ancho: 40, campo: 'fecha' }, { titulo: 'L/V', ancho: 30, campo: 'lv' },
      { titulo: 'Rival', ancho: 90, campo: 'rival' }, { titulo: 'Inicio', ancho: 45, campo: 'inicioPartido' },
      { titulo: 'Demora', ancho: 50, campo: 'demora' }, { titulo: 'ET', ancho: 40, campo: 'et' },
      { titulo: 'Observación', ancho: 220, campo: 'observacion' },
    ],
    informe.controlHorarios,
  );

  // --- Controles Previos ---
  seccion('Controles Previos');
  tabla(
    [
      { titulo: 'Fecha', ancho: 40, campo: 'fecha' }, { titulo: 'FI', ancho: 60, campo: 'fi' },
      { titulo: 'Apellido', ancho: 60, campo: 'apellido' }, { titulo: 'Observación', ancho: 355, campo: 'observacion' },
    ],
    informe.controlesPrevios,
  );

  // --- Durante el partido / Incidentes: siempre en página nueva, como el original ---
  nuevaPagina();
  encabezadoPagina();

  seccion('Durante el partido');
  tabla(
    [{ titulo: 'Fecha', ancho: 40, campo: 'fecha' }, { titulo: 'Observación', ancho: 250, campo: 'observacion' }, { titulo: 'Aclaración', ancho: 225, campo: 'aclaracion' }],
    informe.durantePartido,
  );

  seccion('Incidentes');
  tabla(
    [{ titulo: 'Fecha', ancho: 40, campo: 'fecha' }, { titulo: 'Observación', ancho: 250, campo: 'observacion' }, { titulo: 'Aclaración', ancho: 225, campo: 'aclaracion' }],
    informe.incidentes,
  );

  const bytes = await pdfDoc.save();
  return { bytes, nombreSugerido: nombreArchivoInforme(informe.club) };
}
