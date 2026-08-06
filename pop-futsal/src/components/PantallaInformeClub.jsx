import { useState, useEffect, useMemo } from 'react';
import { obtenerTodosLosPartidos } from '../useAutoSave';
import { esISO } from '../utils/fechasSheet';
import { armarInformeClub } from '../utils/informeClub';
import { generarPDFInformeClub, nombreArchivoInforme } from '../utils/informeClubPdf';
import { descargarPDF } from '../utils/pdfFiller';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030' };

export default function PantallaInformeClub({ onBack }) {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [club, setClub] = useState('');
  const [generando, setGenerando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    const { ok, partidos: nuevos } = await obtenerTodosLosPartidos();
    setError(!ok);
    setPartidos(nuevos);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const clubes = useMemo(() => {
    const set = new Set();
    partidos.forEach(p => {
      [p['Local'], p['Visitante']].forEach(c => { if (c && !esISO(c)) set.add(c); });
    });
    return [...set].sort();
  }, [partidos]);

  const generarYCompartir = async () => {
    if (!club) return;
    setGenerando(true);

    let bytes, nombreSugerido;
    try {
      const informe = armarInformeClub(club, partidos);
      ({ bytes, nombreSugerido } = await generarPDFInformeClub(informe, { fecha: new Date() }));
    } catch (err) {
      console.error('Error generando el PDF del informe:', err);
      alert(`No se pudo armar el PDF del informe.\n\nDetalle técnico: ${err?.message || err}`);
      setGenerando(false);
      return;
    }

    try {
      const archivo = typeof File !== 'undefined' ? new File([bytes], nombreSugerido, { type: 'application/pdf' }) : null;
      const puedeCompartirArchivo = archivo && navigator.canShare && navigator.canShare({ files: [archivo] });
      if (puedeCompartirArchivo) {
        await navigator.share({ files: [archivo], title: `Informe ${club}`, text: `Informe de ${club}` });
      } else {
        descargarPDF(bytes, nombreSugerido);
        alert('Tu celular no permite adjuntar el PDF directo desde acá. Se descargó el archivo: adjuntalo manualmente en WhatsApp o Correo.');
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // El usuario cerró el cuadro de compartir sin elegir nada — no es un error.
      } else {
        console.error('Error compartiendo el PDF:', err);
        // El PDF sí se armó bien; si compartir falla, al menos ofrecemos la descarga directa.
        try {
          descargarPDF(bytes, nombreSugerido);
          alert(`No se pudo abrir el cuadro de compartir (${err?.message || err}). Se descargó el archivo igual: adjuntalo manualmente en WhatsApp o Correo.`);
        } catch (err2) {
          alert(`No se pudo compartir ni descargar el informe.\n\nDetalle técnico: ${err?.message || err}`);
        }
      }
    } finally {
      setGenerando(false);
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

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cargando && <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '20px 0' }}>Cargando...</div>}
        {!cargando && error && (
          <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13 }}>
            No se pudo traer la planilla compartida. Revisá la conexión.
            <div><button onClick={cargar} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
          </div>
        )}
        {!cargando && !error && clubes.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '20px 0' }}>Todavía no hay partidos cargados.</div>
        )}

        {!cargando && !error && clubes.length > 0 && (
          <>
            <select
              value={club} onChange={e => setClub(e.target.value)}
              style={{ height: 48, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 12px', fontSize: 15, fontWeight: 600, color: C.azul, background: C.celeste }}
            >
              <option value="">Seleccioná un club</option>
              {clubes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button onClick={generarYCompartir} disabled={!club || generando} style={{
              minHeight: 56, background: !club || generando ? '#8fa3c9' : C.azul, color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: !club || generando ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
            }}>
              {generando ? 'Generando...' : '📎 Generar y Compartir PDF'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
