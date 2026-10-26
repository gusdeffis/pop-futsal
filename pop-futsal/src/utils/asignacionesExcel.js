import * as XLSX from 'xlsx';

export function nombreArchivoAsignacionesExcel() {
  return 'Partidos_Asignados.xlsx';
}

// Mismas columnas que el PDF (asignacionesPdf.js) — para que el que arma el
// PDF para imprimir/compartir y el que arma el Excel para trabajar los
// datos vean exactamente lo mismo, en el mismo orden.
export function generarExcelAsignaciones(partidos) {
  const filas = partidos.map(p => ({
    'N°': p.partido_nro || '',
    'Local': p.local || '',
    'Visitante': p.visitante || '',
    'Fecha': p.dia || '',
    'Hora': p.hora || '',
    'Estadio': p.estadio || '',
    'Oficial': p.oficial_asignado || '',
  }));
  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 20 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Partidos Asignados');
  const bytes = XLSX.write(libro, { type: 'array', bookType: 'xlsx' });
  return { bytes, nombreSugerido: nombreArchivoAsignacionesExcel() };
}

// Dispara la descarga del archivo — mismo patrón que descargarPDF en
// pdfFiller.js, pero para un Blob de Excel en vez de PDF.
export function descargarExcel(bytes, nombreArchivo) {
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
