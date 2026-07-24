import { useState } from 'react';
import { generarPDFOficial, descargarPDF } from '../utils/pdfFiller';
import { generarActaTexto } from '../utils/acta';
import { enviarAPlanillaCompartida, marcarEnviadoNube } from '../useAutoSave';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030', amarillo: '#fadfba', amarilloTexto: '#8a5a10' };

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

export default function PantallaHistorial({ historial, onBack, onEditar, oficialLogueado, onRecargar }) {
  const [enviandoId, setEnviandoId] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);

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

  const subirANube = async (e, h) => {
    e.stopPropagation();
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
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Historial de Partidos</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>{historial.length} partido{historial.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {historial.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>
            Todavía no hay partidos guardados en el historial.
          </div>
        )}

        {ordenados.map(h => {
          const enCurso = h.estado !== 'finalizado';
          const enviado = h.enviadoNube;
          const bg = enCurso ? C.amarillo : (enviado ? '#c8ecd4' : C.celeste);
          const borde = enCurso ? '#c96a1c' : (enviado ? C.verde : C.azul);
          const colorTexto = enCurso ? C.amarilloTexto : (enviado ? '#1a5c30' : C.azul);
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
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: enCurso ? C.amarilloTexto : (enviado ? '#1a5c30' : C.rojo), textTransform: enviado ? 'uppercase' : 'none' }}>
                    {enCurso
                      ? `en curso · guardado ${new Date(h.timestamp).toLocaleString('es-AR')}`
                      : enviado
                        ? `ENVIADO ${h.fechaEnvioNube ? new Date(h.fechaEnvioNube).toLocaleString('es-AR') : ''}`
                        : `guardado ${new Date(h.timestamp).toLocaleString('es-AR')}`}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch', flexShrink: 0, width: 100 }}>
                  <button onClick={() => onEditar(h)}
                    style={{ flex: 1, minHeight: 44, background: '#fadd2e', color: '#5a4a00', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✏️ EDITAR
                  </button>
                  {!enCurso && (
                    <>
                      <button onClick={e => enviarWSP(e, h)} disabled={enviandoId === h.id}
                        style={{ flex: 1, minHeight: 44, background: enviandoId === h.id ? '#8fa3c9' : '#0d1f4e', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700, cursor: enviandoId === h.id ? 'wait' : 'pointer' }}>
                        {enviandoId === h.id ? '⏳' : '📎'} Enviar Form x WSP
                      </button>
                      {enviado ? (
                        <div style={{ flex: 1, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: C.verde, color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                          ☁️ Enviado
                        </div>
                      ) : (
                        <button onClick={e => subirANube(e, h)} disabled={subiendoId === h.id}
                          style={{ flex: 1, minHeight: 44, background: subiendoId === h.id ? '#e0a0a0' : C.rojo, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700, cursor: subiendoId === h.id ? 'wait' : 'pointer' }}>
                          {subiendoId === h.id ? '⏳' : '☁️ No enviado — Subir'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {enCurso && (
                <div style={{ background: '#c96a1c', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', display: 'inline-block', marginTop: 8 }}>
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
