// Bug real corregido: las fotos que saca la cámara del celular vienen sin
// comprimir — pueden pesar 10-20 MB cada una, a resolución completa
// (4000x3000px o más). Guardarlas y mostrarlas tal cual (sin redimensionar)
// puede agotar la memoria del navegador en celulares con poca RAM, haciendo
// que el sistema mate la app entera con un cartel de "memoria insuficiente".
//
// Primer intento (createImageBitmap SIN opciones + canvas) no alcanzó: ese
// método igual descomprime la foto ENTERA a resolución original en memoria
// antes de poder achicarla, así que el crash podía pasar ANTES de llegar a
// comprimir nada. Ahora se usa el resize integrado de createImageBitmap
// (resizeWidth/resizeHeight), que reduce el tamaño DURANTE la
// decodificación misma — nunca llega a materializar la imagen a tamaño
// completo en memoria.

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
  // Bug real: createImageBitmap(archivo) SIN opciones de resize obliga al
  // navegador a descomprimir la foto ENTERA a resolución original en
  // memoria antes de poder achicarla — en una foto de 4000x3000+ eso solo
  // ya puede reventar la memoria disponible, sin llegar siquiera a la
  // parte de comprimir. La solución es pedirle al navegador que
  // redimensione DURANTE la decodificación (createImageBitmap soporta
  // esto vía resizeWidth/resizeHeight), aprovechando que el formato JPEG
  // permite descartar detalle mientras decodifica, sin nunca materializar
  // la imagen completa en memoria.
  //
  // Paso 1: pido un bitmap chiquito (solo resizeWidth) para enterarme de
  // la proporción real (ancho/alto) de la foto, de forma barata — el
  // navegador calcula el alto solo, sin decodificar a tamaño completo.
  const miniatura = await createImageBitmap(archivo, { resizeWidth: 200 });
  const proporcion = miniatura.height / miniatura.width;
  miniatura.close?.();

  const { ancho, alto } = proporcion >= 1
    ? { ancho: Math.round(maxDimension / proporcion), alto: maxDimension }
    : { ancho: maxDimension, alto: Math.round(maxDimension * proporcion) };

  // Paso 2: pido el bitmap FINAL ya al tamaño de destino — de nuevo,
  // resize durante la decodificación, nunca pasa por resolución completa.
  const bitmap = await createImageBitmap(archivo, {
    resizeWidth: ancho, resizeHeight: alto, resizeQuality: 'medium',
  });
  try {
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
