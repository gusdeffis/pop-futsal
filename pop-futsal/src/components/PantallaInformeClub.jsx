import { useState, useEffect, useMemo } from 'react';
import { obtenerTodosLosPartidos } from '../useAutoSave';
import { esISO } from '../utils/fechasSheet';
import { armarInformeClub } from '../utils/informeClub';
import { normalizarClub, filtrarPartidos } from '../utils/indicadoresClub';
import { generarPDFInformeClub } from '../utils/informeClubPdf';
import { descargarPDF } from '../utils/pdfFiller';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030' };
const inputFiltro = { height: 38, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.azul, background: C.celeste, minWidth: 0 };
const selectFiltro = { ...inputFiltro, fontSize: 12, textTransform: 'uppercase' };

const FILTROS_VACIOS = { torneo: '', division: '', categoriaClub: '', generoMF: '', fechaDesde: '', fechaHasta: '', fechaNroDesde: '', fechaNroHasta: '' };

export default function PantallaInformeClub({ onBack, listas }) {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [numeroInforme, setNumeroInforme] = useState('1');
  const [generando, setGenerando] = useState(false);
  const [informes, setInformes] = useState([]); // [{ club, bytes, nombreSugerido, url }]
  const [indice, setIndice] = useState(0);

  const cargar = async () => {
    setCargando(true);
    const { ok, partidos: nuevos } = await obtenerTodosLosPartidos();
    setError(!ok);
    setPartidos(nuevos);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  // Al desmontar la pantalla, liberar las URLs de los PDF generados (si no,
  // quedan flotando en memoria del navegador).
  useEffect(() => () => informes.forEach(i => i.url && URL.revokeObjectURL(i.url)), []); // eslint-disable-line

  const setFiltro = (campo) => (e) => setFiltros(f => ({ ...f, [campo]: e.target.value }));
  const hayFiltrosActivos = Object.values(filtros).some(v => v !== '');

  const opciones = useMemo(() => ({
    torneos: [...new Set(partidos.map(p => p['Torneo']).filter(Boolean))].sort(),
    divisiones: [...new Set(partidos.map(p => p['Categoría']).filter(Boolean))].sort(),
  }), [partidos]);

  const partidosFiltrados = useMemo(() => filtrarPartidos(partidos, filtros), [partidos, filtros]);

  const clubesFiltrados = useMemo(() => {
    const set = new Set();
    partidosFiltrados.forEach(p => {
      [p['Local'], p['Visitante']].forEach(c => { if (c && !esISO(c)) set.add(normalizarClub(c)); });
    });
    let clubes = [...set];
    if (filtros.categoriaClub) {
      clubes = clubes.filter(c => (listas?.clubesCategoria?.[c] ?? '') === filtros.categoriaClub);
    }
    return clubes.sort();
  }, [partidosFiltrados, filtros.categoriaClub, listas]);

  const generar = async () => {
    if (clubesFiltrados.length === 0) return;
    setGenerando(true);
    informes.forEach(i => i.url && URL.revokeObjectURL(i.url));
    try {
      const nuevos = [];
      for (const club of clubesFiltrados) {
        const informe = armarInformeClub(club, partidosFiltrados);
        const { bytes, nombreSugerido } = await generarPDFInformeClub(informe, { numero: numeroInforme || 1, fecha: new Date() });
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        nuevos.push({ club, bytes, nombreSugerido, url });
      }
      setInformes(nuevos);
      setIndice(0);
    } catch (err) {
      console.error('Error generando los informes:', err);
      alert(`No se pudo armar el PDF del informe.\n\nDetalle técnico: ${err?.message || err}`);
    } finally {
      setGenerando(false);
    }
  };

  const compartirActual = async () => {
    const actual = informes[indice];
    if (!actual) return;
    try {
      const archivo = typeof File !== 'undefined' ? new File([actual.bytes], actual.nombreSugerido, { type: 'application/pdf' }) : null;
      const puedeCompartirArchivo = archivo && navigator.canShare && navigator.canShare({ files: [archivo] });
      if (puedeCompartirArchivo) {
        await navigator.share({ files: [archivo], title: `Informe ${actual.club}`, text: `Informe de ${actual.club}` });
      } else {
        descargarPDF(actual.bytes, actual.nombreSugerido);
        alert('Tu celular no permite adjuntar el PDF directo desde acá. Se descargó el archivo: adjuntalo manualmente en WhatsApp o Correo.');
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // El usuario cerró el cuadro de compartir sin elegir nada — no es un error.
      } else {
        console.error('Error compartiendo el PDF:', err);
        try {
          descargarPDF(actual.bytes, actual.nombreSugerido);
          alert(`No se pudo abrir el cuadro de compartir (${err?.message || err}). Se descargó el archivo igual: adjuntalo manualmente en WhatsApp o Correo.`);
        } catch (err2) {
          alert(`No se pudo compartir ni descargar el informe.\n\nDetalle técnico: ${err?.message || err}`);
        }
      }
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Informe PDF por Club</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>Se arma con los partidos ya cargados</div>
        </div>
      </div>

      {!cargando && !error && partidos.length > 0 && (
        <div style={{ padding: '12px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setMostrarFiltros(m => !m)} style={{
            background: '#fff', color: C.azul, border: `1.5px solid ${C.azul}`, borderRadius: 8,
            padding: '10px 18px', fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'uppercase',
          }}>
            ☰ Filtros{hayFiltrosActivos ? ' •' : ''}
          </button>
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
        </div>
      )}

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cargando && <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '20px 0' }}>Cargando...</div>}
        {!cargando && error && (
          <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13 }}>
            No se pudo traer la planilla compartida. Revisá la conexión.
            <div><button onClick={cargar} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
          </div>
        )}
        {!cargando && !error && partidos.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '20px 0' }}>Todavía no hay partidos cargados.</div>
        )}

        {!cargando && !error && partidos.length > 0 && mostrarFiltros && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8, borderBottom: `1px solid ${C.celeste}` }}>
            <select style={{ ...selectFiltro, width: '100%' }} value={filtros.torneo} onChange={setFiltro('torneo')}>
              <option value="">Todos los Torneos</option>
              {opciones.torneos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select style={{ ...selectFiltro, width: '100%' }} value={filtros.division} onChange={setFiltro('division')}>
              <option value="">Todas las Divisiones</option>
              {opciones.divisiones.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select style={{ ...selectFiltro, width: '100%' }} value={filtros.categoriaClub} onChange={setFiltro('categoriaClub')}>
              <option value="">Todos los Clubes</option>
              {['A', 'B', 'C', 'D'].map(v => <option key={v} value={v}>Categoría {v}</option>)}
            </select>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.azul, textTransform: 'uppercase', marginBottom: 4 }}>Rango de fechas</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="date" style={inputFiltro} value={filtros.fechaDesde} onChange={setFiltro('fechaDesde')} placeholder="Desde" />
                <input type="date" style={inputFiltro} value={filtros.fechaHasta} onChange={setFiltro('fechaHasta')} placeholder="Hasta" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.azul, textTransform: 'uppercase', marginBottom: 4 }}>Rango de fechas de torneo</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="number" style={inputFiltro} value={filtros.fechaNroDesde} onChange={setFiltro('fechaNroDesde')} placeholder="Desde (ej: 1)" />
                <input type="number" style={inputFiltro} value={filtros.fechaNroHasta} onChange={setFiltro('fechaNroHasta')} placeholder="Hasta (ej: 10)" />
              </div>
            </div>
            {hayFiltrosActivos && (
              <button onClick={() => setFiltros(FILTROS_VACIOS)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.rojo, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                ✕ Limpiar filtros
              </button>
            )}
          </div>
        )}

        {!cargando && !error && partidos.length > 0 && (
          <>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.azul, textTransform: 'uppercase', marginBottom: 4 }}>N° de Informe</div>
              <input
                type="number" value={numeroInforme} onChange={e => setNumeroInforme(e.target.value)}
                style={{ ...inputFiltro, width: '100%', height: 44, fontSize: 15 }}
              />
            </div>

            <div style={{ fontSize: 12, color: '#666' }}>
              {clubesFiltrados.length === 0
                ? 'Ningún club coincide con estos filtros.'
                : `${clubesFiltrados.length} club${clubesFiltrados.length > 1 ? 'es' : ''} coincide${clubesFiltrados.length > 1 ? 'n' : ''} con estos filtros: se va a generar 1 informe por cada uno.`}
            </div>

            <button onClick={generar} disabled={clubesFiltrados.length === 0 || generando} style={{
              minHeight: 56, background: clubesFiltrados.length === 0 || generando ? '#8fa3c9' : C.azul, color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: clubesFiltrados.length === 0 || generando ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
            }}>
              {generando ? 'Generando...' : '📄 Generar Informe(s)'}
            </button>
          </>
        )}

        {informes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => setIndice(i => Math.max(0, i - 1))} disabled={indice === 0} style={{
                width: 44, height: 44, borderRadius: 8, border: `1.5px solid ${C.azul}`, background: indice === 0 ? '#eee' : '#fff',
                color: indice === 0 ? '#999' : C.azul, fontSize: 18, fontWeight: 700, cursor: indice === 0 ? 'not-allowed' : 'pointer',
              }}>‹</button>
              <div style={{ textAlign: 'center', fontWeight: 700, color: C.azul }}>
                <div style={{ fontSize: 15, textTransform: 'uppercase' }}>{informes[indice].club}</div>
                <div style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>Club {indice + 1} de {informes.length}</div>
              </div>
              <button onClick={() => setIndice(i => Math.min(informes.length - 1, i + 1))} disabled={indice === informes.length - 1} style={{
                width: 44, height: 44, borderRadius: 8, border: `1.5px solid ${C.azul}`, background: indice === informes.length - 1 ? '#eee' : '#fff',
                color: indice === informes.length - 1 ? '#999' : C.azul, fontSize: 18, fontWeight: 700, cursor: indice === informes.length - 1 ? 'not-allowed' : 'pointer',
              }}>›</button>
            </div>

            <iframe
              title={`Informe ${informes[indice].club}`}
              src={informes[indice].url}
              style={{ width: '100%', height: 480, border: `1.5px solid ${C.celeste}`, borderRadius: 8 }}
            />

            <button onClick={compartirActual} style={{
              minHeight: 52, background: C.verde, color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase',
            }}>
              📎 Compartir informe de {informes[indice].club}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
