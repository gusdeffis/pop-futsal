import { useState } from 'react';
import { generarPDFOficial, descargarPDF } from '../utils/pdfFiller';
import { generarActaTexto } from '../utils/acta';
import { enviarAPlanillaCompartida, marcarEnviadoNube, marcarIntentoEnvio, obtenerTodosLosPartidos } from '../useAutoSave';
import { sheetRowToDatos } from '../utils/sheetRowToDatos';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030', enCursoBg: '#fadfba', enCursoBorde: '#c96a1c' };

// Mismas 4 opciones de conclusión que en Pantalla5 (Acta Final).
const CONCL_LABELS = { normal: 'Partido Normal', obs: 'Con Observaciones', tdd: 'Informe al TDD', susp: 'Suspensión' };

// Fecha/hora sin segundos (antes confundía ver ss en "guardado"/"enviado").
function formatearFechaHora(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Convierte "DD/MM/AAAA" a fecha real para poder ordenar. Si no se puede
// interpretar, devuelve una fecha muy vieja para que quede al final.
function parseDia(dia) {
  if (!dia) return new Date(0);
  const partes = dia.split('/');
  if (partes.length !== 3) return new Date(0);
  const [d, m, a] = partes.map(Number);
  if ([d, m, a].some(Number.isNaN)) return new Date(0);
  return new Date(a, m - 1, d);
}

// Compara nombres de oficial ignorando mayúsculas/minúsculas y espacios
// sobrantes, para que el filtro no falle por diferencias de tipeo menores.
function mismoOficial(a, b) {
  return (a || '').trim().toUpperCase() === (b || '').trim().toUpperCase();
}

export default function PantallaHistorial({ historial: historialCompleto, onBack, onEditar, oficialLogueado, onRecargar }) {
  const [enviandoId, setEnviandoId] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);

  // Punto: el Historial normal es SOLO del dispositivo (localStorage) — si
  // el oficial carga partidos desde el celular y entra desde la PC, no ve
  // nada ahí, son memorias separadas. "Ver todos" trae, bajo pedido (no
  // por defecto, para no demorar la pantalla de entrada), TODOS sus
  // partidos ya enviados a la planilla compartida, sin importar desde qué
  // dispositivo se hayan cargado — mismo camino que ya usa Panel
  // Administrador, filtrado a que solo muestre los del oficial logueado.
  const [verTodos, setVerTodos] = useState(false);
  const [cargandoTodos, setCargandoTodos] = useState(false);
  const [errorTodos, setErrorTodos] = useState(false);
  const [partidosDeLaNube, setPartidosDeLaNube] = useState(null); // null = todavía no se pidió

  const activarVerTodos = async () => {
    setVerTodos(true);
    if (partidosDeLaNube !== null) return; // ya se pidió antes, no repetir
    setCargandoTodos(true);
    setErrorTodos(false);
    try {
      const { ok, partidos } = await obtenerTodosLosPartidos();
      if (!ok) { setErrorTodos(true); return; }
      const mios = partidos
        .filter(p => mismoOficial(p['Oficial AFA'], oficialLogueado))
        .map(p => {
          const datos = sheetRowToDatos(p);
          return {
            id: p['ID App'] || p['ID'] || datos._id,
            torneo: datos.torneo, fecha_nro: datos.fecha_nro, cat: datos.cat,
            local: datos.local, visitante: datos.visitante,
            res_local: datos.res_local, res_visitante: datos.res_visitante,
            dia: datos.dia, conclusiones: datos.conclusiones,
            timestamp: p['Guardado'] ? String(p['Guardado']) : null,
            estado: 'finalizado', enviadoNube: true, fechaEnvioNube: null,
            datos,
          };
        });
      setPartidosDeLaNube(mios);
    } catch {
      setErrorTodos(true);
    } finally {
      setCargandoTodos(false);
    }
  };

  // Cada Oficial ve solo los partidos donde figura como Oficial AFA. Si por
  // algún motivo no hay oficialLogueado (no debería pasar, login obligatorio),
  // se muestra todo para no ocultar datos sin querer.
  const historialLocal = oficialLogueado
    ? historialCompleto.filter(h => mismoOficial(h.datos?.oficial_afa, oficialLogueado))
    : historialCompleto;

  const historial = verTodos && partidosDeLaNube ? partidosDeLaNube : historialLocal;

  const enviarWSP = async (e, h) => {
    e.stopPropagation();
    setEnviandoId(h.id);
    try {
      const { bytes, nombreSugerido } = await generarPDFOficial(h.datos);
      const archivo = new File([bytes], nombreSugerido, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: 'Planilla POP Futsal', text: `${h.local} vs ${h.visitante} — ${h.torneo}` });
      } else {
        descargarPDF(bytes, nombreSugerido);
        alert('Tu celular no permite adjuntar el PDF directo desde acá. Se descargó el archivo: adjuntalo manualmente en WhatsApp.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') alert('No se pudo generar el PDF de este partido.');
    } finally {
      setEnviandoId(null);
    }
  };

  const subirANube = async (e, h, reenvio = false) => {
    e.stopPropagation();
    if (reenvio) {
      const fecha = h.fechaEnvioNube ? formatearFechaHora(h.fechaEnvioNube) : 'antes';
      const ok = window.confirm(`Este partido ya fue enviado el ${fecha}. ¿Querés reenviarlo? Se va a actualizar el dato anterior en la planilla.`);
      if (!ok) return;
    } else if (h.ultimoIntentoEnvio) {
      // Aunque la tarjeta todavía diga "No enviado", si hubo un intento
      // hace muy poco puede ser que ese envío anterior sí haya llegado a
      // la planilla y la respuesta simplemente no se haya confirmado a
      // tiempo en el celular — reenviar ahí puede duplicar la fila.
      const segundosDesdeUltimoIntento = (Date.now() - new Date(h.ultimoIntentoEnvio).getTime()) / 1000;
      if (segundosDesdeUltimoIntento < 120) {
        const ok = window.confirm(
          `Hace menos de 2 minutos ya intentaste enviar este partido. Puede que ese envío haya funcionado y todavía no se haya reflejado acá.\n\nSi volvés a enviar ahora, podría quedar duplicado en la planilla.\n\n¿Preferís esperar un momento y revisar antes? Tocá Cancelar para esperar, o Aceptar para enviar de todos modos.`
        );
        if (!ok) return;
      }
    }
    marcarIntentoEnvio(h.id);
    setSubiendoId(h.id);
    try {
      const actaTexto = h.actaTexto || generarActaTexto(h.datos);
      const ok = await enviarAPlanillaCompartida(h.datos, actaTexto, oficialLogueado);
      marcarEnviadoNube(h.id, ok);
      if (!ok) alert('No se pudo subir a la planilla compartida. Revisá la conexión e intentá de nuevo.');
      onRecargar && onRecargar();
    } finally {
      setSubiendoId(null);
    }
  };

  const ordenados = [...historial].sort((a, b) => parseDia(b.dia) - parseDia(a.dia));

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Historial de Partidos</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>
            {verTodos ? 'Todos los dispositivos' : 'Este dispositivo'} · {historial.length} partido{historial.length !== 1 ? 's' : ''}
          </div>
        </div>
        {!verTodos && (
          <button onClick={activarVerTodos} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>
            🌐 Ver todos
          </button>
        )}
        {verTodos && (
          <button onClick={() => setVerTodos(false)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>
            📱 Solo este
          </button>
        )}
      </div>

      {cargandoTodos && (
        <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '16px 0' }}>Buscando en todos los dispositivos...</div>
      )}
      {errorTodos && !cargandoTodos && (
        <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13, padding: '16px' }}>
          No se pudo traer los partidos de la nube. Revisá la conexión.
          <div><button onClick={activarVerTodos} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
        </div>
      )}

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {historial.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>
            Todavía no hay partidos guardados en el historial.
          </div>
        )}

        {ordenados.map(h => {
          const enCurso = h.estado !== 'finalizado';
          const enviado = h.enviadoNube;
          const bg = enCurso ? C.enCursoBg : (enviado ? '#c8ecd4' : C.celeste);
          const borde = enCurso ? C.enCursoBorde : (enviado ? C.verde : C.azul);
          const colorTexto = enCurso ? C.rojo : (enviado ? '#1a5c30' : C.azul);
          const division = h.datos?.division === 'M' ? 'Masculino' : h.datos?.division === 'F' ? 'Femenino' : '';
          const hora = h.datos?.hora || '';

          return (
            <div key={h.id} style={{ border: `1.5px solid ${borde}`, borderRadius: 10, padding: 12, background: bg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: colorTexto, fontWeight: 700, textTransform: 'uppercase' }}>
                    {h.torneo}{division && ` - ${division}`}
                  </div>
                  <div style={{ fontSize: 11, color: colorTexto, fontWeight: 700, textTransform: 'uppercase' }}>
                    {h.fecha_nro && `Fecha ${h.fecha_nro}`}{h.cat && ` - Categoría ${h.cat}`}
                  </div>
                  <div style={{ fontSize: 17, color: colorTexto, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
                    <div>{h.local || '(sin local)'} {h.res_local ?? '-'}</div>
                    <div>vs {h.visitante || '(sin visitante)'} {h.res_visitante ?? '-'}</div>
                  </div>
                  <div style={{ fontSize: 16, color: colorTexto, fontWeight: 700, marginTop: 6 }}>
                    {h.dia || '(sin fecha)'}{hora && ` - ${hora} hs`}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: enCurso ? C.rojo : (enviado ? '#1a5c30' : C.rojo), textTransform: enviado ? 'uppercase' : 'none' }}>
                    {enCurso
                      ? `en curso · guardado ${formatearFechaHora(h.timestamp)}`
                      : enviado
                        ? `ENVIADO ${formatearFechaHora(h.fechaEnvioNube)}`
                        : `guardado ${formatearFechaHora(h.timestamp)}`}
                  </div>
                  {h.conclusiones?.length > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, color: colorTexto, textTransform: 'uppercase' }}>
                      {h.conclusiones.map(c => CONCL_LABELS[c]).filter(Boolean).join(' / ')}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch', justifyContent: 'flex-start', flexShrink: 0, width: 100 }}>
                  <button onClick={() => onEditar(h)}
                    style={{ ...(enCurso ? {} : { flex: 1 }), minHeight: 44, background: '#fadfba', color: '#8a5a10', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✏️ EDITAR
                  </button>
                  {!enCurso && (
                    <>
                      <button onClick={e => enviarWSP(e, h)} disabled={enviandoId === h.id}
                        style={{ flex: 1, minHeight: 44, background: enviandoId === h.id ? '#8fa3c9' : '#0d1f4e', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700, cursor: enviandoId === h.id ? 'wait' : 'pointer' }}>
                        {enviandoId === h.id ? '⏳' : '📎'} Enviar Form x WSP
                      </button>
                      {enviado ? (
                        <button onClick={e => subirANube(e, h, true)} disabled={subiendoId === h.id}
                          style={{ flex: 1, minHeight: 44, background: subiendoId === h.id ? '#8fc9a3' : C.verde, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', cursor: subiendoId === h.id ? 'wait' : 'pointer' }}>
                          {subiendoId === h.id ? '⏳' : '☁️ Enviado'}
                        </button>
                      ) : (
                        <button onClick={e => subirANube(e, h, false)} disabled={subiendoId === h.id}
                          style={{ flex: 1, minHeight: 44, background: subiendoId === h.id ? '#e0a0a0' : C.rojo, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700, cursor: subiendoId === h.id ? 'wait' : 'pointer' }}>
                          {subiendoId === h.id ? '⏳' : '☁️ No enviado — Subir'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {enCurso && (
                <div style={{ background: C.rojo, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', display: 'inline-block', marginTop: 8 }}>
                  En curso
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
