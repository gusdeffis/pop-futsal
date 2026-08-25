import { useState, useEffect, useMemo } from 'react';
import { obtenerTodosLosPartidos } from '../useAutoSave';
import { esISO, formatearDia, formatearHora, claveDia, valorFecha } from '../utils/fechasSheet';
import { sheetRowToDatos } from '../utils/sheetRowToDatos';
import { generarActaTexto } from '../utils/acta';
import { armarTextoWhatsApp } from '../utils/whatsappTexto';
import { generarPDFOficial, descargarPDF } from '../utils/pdfFiller';
import { soloApellido } from '../utils/fixture';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030' };

// Mismas 4 opciones de conclusión que en Pantalla5/Historial, ahora leídas
// de las columnas de la planilla compartida (booleanas SI/vacío).
const CONCL_COLUMNAS = [
  ['Partido Normal', 'Partido Normal'],
  ['Con Observaciones', 'Con Observaciones'],
  ['Informe al TDD', 'Informe al TDD'],
  ['Suspensión', 'Suspensión'],
];

function conclusionesDe(p) {
  return CONCL_COLUMNAS.filter(([col]) => String(p[col] || '').trim().toUpperCase() === 'SI').map(([, label]) => label);
}

const FILTROS_VACIOS = { generoMF: '', torneo: '', fecha_nro: '', oficial: '', dia: '', club: '', conclusion: '' };

// Un partido "toca" un club si aparece como Local o como Visitante — así el
// filtro de Club encuentra el partido sin importar el rol.
function coincideClub(p, club) {
  if (!club) return true;
  const c = club.trim().toUpperCase();
  return (p['Local'] || '').toUpperCase().includes(c) || (p['Visitante'] || '').toUpperCase().includes(c);
}

// Si el nombre del club en realidad quedó guardado como fecha (Sheets lo
// malinterpretó, como pasó antes con "17 DE AGOSTO"), avisa en vez de
// mostrar la fecha cruda como si fuera un nombre de club.
function nombreClub(v, sinDato) {
  if (!v) return sinDato;
  if (esISO(v)) return '(nombre inválido en la planilla)';
  return v;
}

export default function PantallaAdmin({ onBack, onEditarListas, onEditar, listas }) {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [enviandoIdx, setEnviandoIdx] = useState(null);

  const cargar = async () => {
    setCargando(true);
    const { ok, partidos } = await obtenerTodosLosPartidos();
    setError(!ok);
    setPartidos(partidos);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const enviarWSP = async (e, p, idx) => {
    e.stopPropagation();
    setEnviandoIdx(idx);
    try {
      const datos = sheetRowToDatos(p);
      const { bytes, nombreSugerido } = await generarPDFOficial(datos);
      const archivo = new File([bytes], nombreSugerido, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: 'Planilla POP Futsal', text: `${datos.local} vs ${datos.visitante} — ${datos.torneo}` });
      } else {
        descargarPDF(bytes, nombreSugerido);
        alert('Tu celular no permite adjuntar el PDF directo desde acá. Se descargó el archivo: adjuntalo manualmente en WhatsApp.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') alert(`No se pudo generar el PDF de este partido.\n\nDetalle técnico: ${err?.message || err}`);
    } finally {
      setEnviandoIdx(null);
    }
  };

  const compartirDatos = (e, p) => {
    e.stopPropagation();
    const datos = sheetRowToDatos(p);
    // Si ya hay un Acta Final guardada en la planilla, se respeta tal cual
    // (es el texto oficial ya generado en su momento). Si hay que
    // generarla de cero acá, se usa la versión sin repetir la conclusión
    // (ya se muestra arriba en su propia sección del mensaje de WSP).
    const actaTexto = p['Acta Final'] || generarActaTexto(datos, { paraWSP: true });
    const texto = armarTextoWhatsApp(datos, actaTexto, listas?.arbitros);
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
  };

  const opciones = useMemo(() => {
    // Un valor representativo por día calendario, aunque haya partidos con
    // horas distintas pegadas en la misma celda de "Día".
    const diasVistos = new Map();
    partidos.forEach(p => {
      const v = p['Día'];
      if (!v) return;
      const clave = claveDia(v);
      if (!diasVistos.has(clave)) diasVistos.set(clave, v);
    });
    // Punto: el orden real de las fechas (1, 2, 3... 4°, 8°, Fase 1, Final,
    // etc.) vive en la hoja "Fechas" de POP-Datos (listas.fechas) — antes
    // acá se recalculaba con Number(a)-Number(b), que rompe con cualquier
    // valor no numérico ("Fase 1" quedaba mezclado sin orden fijo) y
    // tampoco respetaba el orden real de la planilla. Ahora se ordena según
    // esa lista de referencia — comparando sin importar mayúsculas (la
    // lista de referencia viene toda en MAYÚSCULA, pero el valor real
    // cargado en un partido puede tener "Fase 1" con minúsculas), y
    // dejando el valor ORIGINAL del partido (no el de la lista) para que el
    // filtro siga comparando exacto contra lo que hay en los partidos.
    // Bug real corregido: si "Fecha N°" llega como número en algunos
    // partidos y como texto en otros (según cómo la haya escrito Sheets al
    // guardar — mismo tipo de problema que ya vimos con Hora/Día), un
    // Set() los trataba como 2 valores DISTINTOS aunque se vean iguales
    // ("25" texto ≠ 25 número para JavaScript) — quedaban 2 fechas
    // repetidas en el desplegable. Se pasan todas a String() antes de
    // armar el conjunto, así "25" y 25 quedan como la misma.
    const ordenReferencia = new Map((listas?.fechas || []).map((f, i) => [String(f).toUpperCase(), i]));
    const fechas = [...new Set(partidos.map(p => String(p['Fecha N°'] || '')).filter(Boolean))]
      .sort((a, b) => {
        const ia = ordenReferencia.get(String(a).toUpperCase());
        const ib = ordenReferencia.get(String(b).toUpperCase());
        if (ia !== undefined && ib !== undefined) return ia - ib; // ambas están en la lista de referencia
        if (ia !== undefined) return -1; // solo "a" está: va primero
        if (ib !== undefined) return 1; // solo "b" está: va primero
        return String(a).localeCompare(String(b)); // ninguna está: alfabético, para no dejarlo al azar
      });
    return {
      torneos: [...new Set(partidos.map(p => p['Torneo']).filter(Boolean))].sort(),
      fechas,
      oficiales: [...new Set(partidos.map(p => p['Oficial AFA']).filter(Boolean))].sort(),
      dias: [...diasVistos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
    };
  }, [partidos, listas?.fechas]);

  const filtrados = useMemo(() => partidos.filter(p =>
    (!filtros.generoMF || p['División'] === filtros.generoMF) &&
    (!filtros.torneo || p['Torneo'] === filtros.torneo) &&
    (!filtros.fecha_nro || String(p['Fecha N°']) === filtros.fecha_nro) &&
    (!filtros.oficial || p['Oficial AFA'] === filtros.oficial) &&
    (!filtros.dia || claveDia(p['Día']) === claveDia(filtros.dia)) &&
    (!filtros.conclusion || conclusionesDe(p).includes(filtros.conclusion)) &&
    coincideClub(p, filtros.club)
  ).sort((a, b) => valorFecha(b['Día']) - valorFecha(a['Día'])), [partidos, filtros]);

  const setFiltro = (campo) => (e) => setFiltros(f => ({ ...f, [campo]: e.target.value }));

  const selectStyle = {
    height: 40, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 10px',
    fontSize: 13, fontWeight: 600, color: C.azul, background: C.celeste, outline: 'none',
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Panel Administrador</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>{filtrados.length} de {partidos.length} partido{partidos.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={onEditarListas} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase' }}>
          🛠️ Editar Listas
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['M', 'F'].map(g => (
            <button
              key={g}
              onClick={() => setFiltros(f => ({ ...f, generoMF: f.generoMF === g ? '' : g }))}
              style={{
                width: 40, height: 40, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                background: filtros.generoMF === g ? C.azul : '#fff', color: filtros.generoMF === g ? '#fff' : C.azul,
                border: `1.5px solid ${C.azul}`,
              }}
            >{g}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select style={selectStyle} value={filtros.torneo} onChange={setFiltro('torneo')}>
            <option value="">Todos los Torneos</option>
            {opciones.torneos.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selectStyle} value={filtros.fecha_nro} onChange={setFiltro('fecha_nro')}>
            <option value="">Toda Fecha N°</option>
            {opciones.fechas.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selectStyle} value={filtros.oficial} onChange={setFiltro('oficial')}>
            <option value="">Todo Oficial AFA</option>
            {opciones.oficiales.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selectStyle} value={filtros.dia} onChange={setFiltro('dia')}>
            <option value="">Toda Fecha</option>
            {opciones.dias.map(v => <option key={v} value={v}>{formatearDia(v)}</option>)}
          </select>
          <select style={{ ...selectStyle, gridColumn: '1 / -1' }} value={filtros.conclusion} onChange={setFiltro('conclusion')}>
            <option value="">Todas</option>
            {CONCL_COLUMNAS.map(([, label]) => <option key={label} value={label}>{label}</option>)}
          </select>
        </div>
        <input
          type="text" placeholder="Filtrar por Club (Local o Visitante)"
          value={filtros.club} onChange={setFiltro('club')}
          style={{ ...selectStyle, gridColumn: '1 / -1', textTransform: 'uppercase' }}
        />
        {(filtros.generoMF || filtros.torneo || filtros.fecha_nro || filtros.oficial || filtros.dia || filtros.club || filtros.conclusion) && (
          <button onClick={() => setFiltros(FILTROS_VACIOS)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.rojo, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            ✕ Limpiar filtros
          </button>
        )}

        {cargando && <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>Cargando partidos...</div>}
        {!cargando && error && (
          <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13, padding: '20px 0' }}>
            No se pudo traer la planilla compartida. Revisá la conexión.
            <div><button onClick={cargar} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
          </div>
        )}
        {!cargando && !error && filtrados.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>No hay partidos con estos filtros.</div>
        )}

        {!cargando && filtrados.map((p, i) => (
          <div key={i} style={{ border: `1.5px solid ${C.azul}`, borderRadius: 10, padding: 12, background: C.celeste }}>
            {/* Punto: reorganizado en 2 líneas más chicas (Torneo+Fecha+N°
                arriba, Día+Hora+Oficial abajo), con Local/Visitante
                quedando más grande y arriba de todo lo demás en jerarquía
                visual — un punto menos de tamaño en estas 2 líneas de
                arriba, a pedido. */}
            <div style={{ fontSize: 15, color: C.azul, fontWeight: 700, marginTop: 6, textTransform: 'uppercase' }}>
              {p['Torneo']}{p['División'] && ` (${p['División'] === 'F' ? 'F' : 'M'})`}{p['Fecha N°'] && ` - Fecha ${p['Fecha N°']}`}
              {p['Partido N°'] && ` - N° ${p['Partido N°']}`}
            </div>
            <div style={{ fontSize: 15, color: C.azul, fontWeight: 700, marginTop: 2 }}>
              {formatearDia(p['Día']) || '(sin fecha)'}{p['Hora'] && ` - ${formatearHora(p['Hora'])} hs`}
              {p['Oficial AFA'] && ` - Oficial: ${soloApellido(p['Oficial AFA'])}`}
            </div>
            <div style={{ fontSize: 17, color: C.azul, fontWeight: 700, marginTop: 2, lineHeight: 1.3 }}>
              <div>{nombreClub(p['Local'], '(sin local)')} {p['Res. Local'] ?? '-'}</div>
              <div>vs {nombreClub(p['Visitante'], '(sin visitante)')} {p['Res. Visitante'] ?? '-'}</div>
            </div>
            {conclusionesDe(p).length > 0 && (
              <div style={{ fontSize: 16, color: C.azul, fontWeight: 700, marginTop: 6 }}>
                {conclusionesDe(p).join(' / ')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {onEditar && (
                <button onClick={e => { e.stopPropagation(); onEditar(p); }}
                  style={{ flex: 1, minHeight: 40, background: '#fadfba', color: '#8a5a10', border: '1.5px solid #c96a1c', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                  ✏️ EDITAR
                </button>
              )}
              <button onClick={e => enviarWSP(e, p, i)} disabled={enviandoIdx === i}
                style={{ flex: 1, minHeight: 40, background: enviandoIdx === i ? '#8fa3c9' : C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700, cursor: enviandoIdx === i ? 'wait' : 'pointer' }}>
                {enviandoIdx === i ? '⏳' : '📎'} PDF x WSP
              </button>
              <button onClick={e => compartirDatos(e, p)}
                style={{ flex: 1, minHeight: 40, background: C.verde, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                💬 Datos x WSP
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
