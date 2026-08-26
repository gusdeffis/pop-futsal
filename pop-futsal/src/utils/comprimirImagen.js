// Bug real corregido: las fotos que saca la cámara del celular vienen sin
// comprimir — pueden pesar 10-20 MB cada una, a resolución completa
// (4000x3000px o más). Guardarlas y mostrarlas tal cual (sin redimensionar)
// puede agotar la memoria del navegador en celulares con poca RAM, haciendo
// que el sistema mate la app entera con un cartel de "memoria insuficiente".
// Acá se redimensiona a un tamaño razonable para leer una planilla
// fotografiada (de sobra para eso) y se recomprime como JPEG, ANTES de
// guardarla en cualquier lado.

// Calcula el nuevo ancho/alto manteniendo la proporción original, sin que
// ningún lado supere maxDimension. Función pura, sin nada de navegador —
// separada así para poder probarla directamente, sin depender de canvas.
export function calcularDimensionesComprimidas(anchoOriginal, altoOriginal, maxDimension = 1600) {
  if (anchoOriginal <= maxDimension && altoOriginal <= maxDimension) {
    return { ancho: anchoOriginal, alto: altoOriginal };
  }
  const escala = anchoOriginal > altoOriginal ? maxDimension / anchoOriginal : maxDimension / altoOriginal;
  return { ancho: Math.max(1, Math.round(anchoOriginal * escala)), alto: Math.max(1, Math.round(altoOriginal * escala)) };
}

export async function comprimirImagen(archivo, { maxDimension = 1600, calidad = 0.75 } = {}) {
  const bitmap = await createImageBitmap(archivo);
  try {
    const { ancho, alto } = calcularDimensionesComprimidas(bitmap.width, bitmap.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
        'image/jpeg',
        calidad
      );
    });
  } finally {
    bitmap.close?.();
  }
}
