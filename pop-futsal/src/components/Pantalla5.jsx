import { Header, SeccionHeader, Campo, Input, Textarea, Divider, BtnBack } from './UI';
import { generarActaTexto } from '../utils/acta';
import { useState } from 'react';
import { generarPDFOficial, descargarPDF } from '../utils/pdfFiller';

const CONCL_OPCIONES = [
  { id: 'normal', label: 'Partido Normal', color: '#1a7a3a', bg: '#e8f5ee', exclusivo: true },
  { id: 'obs', label: 'Con Observaciones', color: '#0d1f4e', bg: '#e8edf8', exclusivo: false },
  { id: 'tdd', label: 'Informe al TDD', color: '#e03030', bg: '#fff0f0', exclusivo: false },
  { id: 'susp', label: 'Suspensión', color: '#e03030', bg: '#fff0f0', exclusivo: false },
];

export default function Pantalla5({ datos, setDatos, onBack, onInicio, onFinalizar }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));

  const handleFinalizar = () => {
    const ok = window.confirm('¿Finalizar este partido? Va a pasar al Historial. Podés volver a editarlo desde ahí si hace falta.');
    if (ok) onFinalizar();
  };

  const conclusiones = datos.conclusiones || [];

  const toggleConclusion = (id, exclusivo) => {
    if (exclusivo) {
      // Si es "Partido Normal", deselecciona todo lo demás
      const nuevas = conclusiones.includes(id) ? [] : [id];
      set('conclusiones')(nuevas);
    } else {
      // Si seleccionás otro, deseleccioná "normal"
      let nuevas = conclusiones.filter(c => c !== 'normal');
      if (nuevas.includes(id)) {
        nuevas = nuevas.filter(c => c !== id);
      } else {
        nuevas = [...nuevas, id];
      }
      set('conclusiones')(nuevas);
    }
  };

  const actaTexto = generarActaTexto(datos);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [errorPDF, setErrorPDF] = useState('');

  const handleGenerarPDF = async () => {
    setGenerandoPDF(true);
    setErrorPDF('');
    try {
      const { bytes, nombreSugerido } = await generarPDFOficial(datos);
      descargarPDF(bytes, nombreSugerido);
    } catch (e) {
      setErrorPDF('No se pudo generar el PDF. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const [enviandoWSP, setEnviandoWSP] = useState(false);

  const handleEnviarFormWSP = async () => {
    setEnviandoWSP(true);
    setErrorPDF('');
    try {
      const { bytes, nombreSugerido } = await generarPDFOficial(datos);
      const archivo = new File([bytes], nombreSugerido, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({
          files: [archivo],
          title: 'Planilla POP Futsal',
          text: `${datos.local} vs ${datos.visitante} — ${datos.torneo}`,
        });
      } else {
        // El celular no soporta compartir archivos desde el navegador:
        // se descarga el PDF para que lo adjunte a mano en WhatsApp.
        descargarPDF(bytes, nombreSugerido);
        alert('Tu celular no permite adjuntar el PDF directo desde acá. Se descargó el archivo: adjuntalo manualmente en WhatsApp.');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setErrorPDF('No se pudo enviar el formulario. Probá con "GENERAR PDF" y adjuntalo a mano.');
      }
    } finally {
      setEnviandoWSP(false);
    }
  };

  const handleWhatsApp = () => {
    const resLocal = datos.res_local || '-';
    const resVisita = datos.res_visitante || '-';
    const concl = conclusiones.map(c => CONCL_OPCIONES.find(o => o.id === c)?.label).filter(Boolean).join(' / ');
    const texto =
      `*POP - Planilla Oficial de Partido Futsal*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *${datos.torneo}* | Fecha ${datos.fecha_nro}\n` +
      `📅 ${datos.dia} | ${datos.hora} hs\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚽ *${datos.local}* ${resLocal} - ${resVisita} *${datos.visitante}*\n` +
      `🏟️ ${datos.estadio}\n` +
      `🟡 Árbitro: ${datos.arbitro}\n` +
      `👤 Oficial AFA: ${datos.oficial_afa}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⏱️ Ingreso: ${datos.ingreso} | Inicio real: ${datos.hora_real}\n` +
      `⏱️ Final 1°T: ${datos.final_1t} | Inicio 2°T: ${datos.inicio_2t}\n` +
      `⏱️ Final partido: ${datos.final_partido}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 *Conclusión: ${concl}*\n\n` +
      `*ACTA FINAL:*\n${actaTexto}` +
      (datos.acta_extra ? `\n${datos.acta_extra}` : '');
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={5} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <SeccionHeader>5. Acta Final</SeccionHeader>

        {/* Resultado */}
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          Resultado del partido
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#e8edf8', border: '1.5px solid #b8c8e8', borderRadius: 10, padding: 16 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1f4e', marginBottom: 6 }}>{datos.local || 'Local'}</div>
            <input type="number" value={datos.res_local} onChange={e => set('res_local')(e.target.value)}
              style={{ width: '100%', height: 52, border: '2px solid #0d1f4e', borderRadius: 8, textAlign: 'center', fontSize: 28, fontWeight: 700, color: '#0d1f4e', background: '#fff', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, visibility: 'hidden' }}>—</div>
            <div style={{ height: 52, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#0d1f4e' }}>—</span>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1f4e', marginBottom: 6 }}>{datos.visitante || 'Visita'}</div>
            <input type="number" value={datos.res_visitante} onChange={e => set('res_visitante')(e.target.value)}
              style={{ width: '100%', height: 52, border: '2px solid #0d1f4e', borderRadius: 8, textAlign: 'center', fontSize: 28, fontWeight: 700, color: '#0d1f4e', background: '#fff', outline: 'none' }} />
          </div>
        </div>

        <Divider />

        {/* Conclusión */}
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          Conclusión general
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CONCL_OPCIONES.map(({ id, label, color, bg, exclusivo }) => {
            const selected = conclusiones.includes(id);
            return (
              <button key={id} onClick={() => toggleConclusion(id, exclusivo)} style={{
                padding: '14px 10px', border: `2px solid ${selected ? color : '#b8c8e8'}`,
                borderRadius: 8, background: selected ? color : bg,
                color: selected ? '#fff' : color,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1.3,
                transition: 'all .15s',
              }}>{label}</button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
          "Partido Normal" es exclusivo. Los demás se pueden combinar.
        </div>

        <Divider />

        {/* Acta automática */}
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          Acta Final
        </div>
        <div style={{ background: '#e8edf8', border: '2px solid #0d1f4e', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#0d1f4e', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 8 }}>
            Texto generado automáticamente
          </div>
          <div style={{ fontSize: 14, color: '#0d1f4e', lineHeight: 1.7, minHeight: 50, fontWeight: 500, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {actaTexto}
          </div>
          <textarea
            value={datos.acta_extra}
            onChange={e => set('acta_extra')(e.target.value.toUpperCase())}
            placeholder="Agregá texto adicional si es necesario..."
            style={{ width: '100%', minHeight: 60, border: '1.5px solid #b8c8e8', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#0d1f4e', background: '#fff', resize: 'vertical', fontFamily: 'inherit', outline: 'none', marginTop: 10, boxSizing: 'border-box' }}
          />
        </div>

      </div>

      {/* Botones finales */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <BtnBack onClick={onBack} />
          <button onClick={handleGenerarPDF} disabled={generandoPDF}
            style={{ flex: 1, height: 50, background: generandoPDF ? '#8fa3c9' : '#0d1f4e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: generandoPDF ? 'wait' : 'pointer' }}>
            {generandoPDF ? '⏳ Generando...' : '📄 GENERAR PDF'}
          </button>
        </div>
        {errorPDF && <div style={{ color: '#e03030', fontSize: 12, fontWeight: 600 }}>{errorPDF}</div>}
        <button onClick={handleEnviarFormWSP} disabled={enviandoWSP}
          style={{ width: '100%', height: 50, background: enviandoWSP ? '#8fa3c9' : '#1a7a3a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: enviandoWSP ? 'wait' : 'pointer' }}>
          {enviandoWSP ? '⏳ Preparando...' : '📎 ENVIAR FORMULARIO por WhatsApp'}
        </button>
        <button onClick={handleWhatsApp}
          style={{ width: '100%', height: 50, background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          💬 COMPARTIR DATOS por WhatsApp
        </button>
        {onFinalizar && (
          <button onClick={handleFinalizar}
            style={{ width: '100%', height: 52, background: '#0d1f4e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            ✅ FINALIZAR PARTIDO
          </button>
        )}
        {onInicio && (
          <button onClick={onInicio}
            style={{ width: '100%', height: 44, background: '#fff', color: '#0d1f4e', border: '1.5px solid #0d1f4e', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            🏠 Volver al inicio
          </button>
        )}
      </div>
    </div>
  );
}
