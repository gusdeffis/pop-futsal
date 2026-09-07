// Filtra la lista de clubes según la categoría del torneo elegido.
// Es una función pura, testeada aparte del componente.

// Si el torneo termina en "A", "B", "C" o "D" (ej: "Camp. de 1° A"), esa es
// su categoría. Si no, el torneo no está categorizado (ej: "Copa Argentina").
export function categoriaDeTorneo(torneo) {
  if (!torneo) return null;
  const partes = torneo.trim().split(/\s+/);
  const ultima = (partes[partes.length - 1] || '').toUpperCase();
  return ['A', 'B', 'C', 'D'].includes(ultima) ? ultima : null;
}

// Filtra los clubes por la categoría del torneo elegido. Si el torneo no
// tiene categoría, o todavía no hay ningún club cargado con esa categoría
// en la lista (falta completarla en "Editar Listas"), se muestran todos —
// para no dejar el campo vacío por datos incompletos.
export function clubesParaTorneo(torneo, clubes, clubesCategoria) {
  const cat = categoriaDeTorneo(torneo);
  if (!cat) return clubes;
  const filtrados = (clubes || []).filter(c => (clubesCategoria?.[c] || '') === cat);
  return filtrados.length > 0 ? filtrados : clubes;
}
