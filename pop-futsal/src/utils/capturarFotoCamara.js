// Funciones puras usadas por la cámara en página (CamaraEnPagina.jsx) —
// separadas acá para poder probarlas directo, sin depender de getUserMedia
// ni de un <video> real (que no existen en el entorno de test).

// Calcula el ancho/alto de captura, sin superar maxDimension en el lado más
// largo, manteniendo la proporción real del video.
export function calcularDimensionesCaptura(anchoOriginal, altoOriginal, maxDimension = 1280) {
  const escala = Math.min(1, maxDimension / Math.max(anchoOriginal, altoOriginal));
  return {
    ancho: Math.max(1, Math.round(anchoOriginal * escala)),
    alto: Math.max(1, Math.round(altoOriginal * escala)),
  };
}

// Punto pedido: la foto se genera ya al tamaño que definimos (~1MB o
// menos) — nunca pasa por una imagen gigante de resolución completa,
// porque la captura en sí ya arranca redimensionada (ver
// calcularDimensionesCaptura). Esto solo ajusta la CALIDAD del JPEG,
// probando de a poco hasta entrar debajo del objetivo de peso.
//
// `generarBlob(calidad)` es una función inyectada que arma el blob a esa
// calidad — así el loop en sí se puede probar sin canvas real.
export async function reducirCalidadHastaTamano(generarBlob, {
  targetBytes = 1_000_000, calidadInicial = 0.85, calidadMinima = 0.35, paso = 0.15,
} = {}) {
  let calidad = calidadInicial;
  let blob = await generarBlob(calidad);
  while (blob.size > targetBytes && calidad > calidadMinima) {
    // Redondeo a 2 decimales: la resta de floats en JS (ej. 0.85 - 0.15)
    // puede dar 0.7000000000000001 en vez de 0.7 — sin redondear, esto
    // podría acumular imprecisión en pasos sucesivos.
    const siguienteCalidad = Math.round(Math.max(calidadMinima, calidad - paso) * 100) / 100;
    const siguiente = await generarBlob(siguienteCalidad);
    // Si bajar la calidad no logró achicar el archivo, no tiene sentido
    // seguir probando — evita quedar en un loop sin avanzar.
    if (siguiente.size >= blob.size) { blob = siguiente; break; }
    blob = siguiente;
    calidad = siguienteCalidad;
  }
  return blob;
}
