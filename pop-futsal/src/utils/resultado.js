// Resultado del partido con definición por penales (playoffs).
// Si se cargaron los penales de AMBOS equipos, se muestran entre paréntesis
// al lado del resultado: 4 (3) — 4 (2). Si falta alguno, el resultado queda igual.
export function resultadoConPenales(datos) {
  const rl = String(datos.res_local ?? '').trim();
  const rv = String(datos.res_visitante ?? '').trim();
  const pl = String(datos.pen_local ?? '').trim();
  const pv = String(datos.pen_visitante ?? '').trim();
  const hayPenales = pl !== '' && pv !== '';
  return {
    local: hayPenales && rl !== '' ? `${rl} (${pl})` : rl,
    visitante: hayPenales && rv !== '' ? `${rv} (${pv})` : rv,
    hayPenales,
  };
}
