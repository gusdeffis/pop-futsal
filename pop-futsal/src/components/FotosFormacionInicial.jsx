import { useEffect, useRef, useState } from 'react';
import { guardarFoto, obtenerFotosFormacion } from '../utils/fotosFormacion';
import { comprimirImagen } from '../utils/comprimirImagen';

// Mismo alto/padding que la fila de Vest. Local/Visita/Árbitro (punto
// pedido) — estos botones no deben ser más grandes que el resto de la
// pantalla de Control Previo.
const ALTO_BOTON = 42;

// Casillero de una foto (Local o Visita): muestra la miniatura si ya está
// sacada, o el botón de cámara si todavía no. Punto pedido: sin ícono de
// cámara, texto en mayúscula con el mismo tamaño/tipo de letra que el
// resto de los botones de instalaciones (13px, semi-negrita). Una vez
// enviada, pasa a verde pastel con "ENVIADA" en vez de "Lista".
function CasilleroFoto({ label, foto, enviada, onSacar, disabled }) {
  const inputRef = useRef(null);
  const url = foto ? URL.createObjectURL(foto) : null;
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const colorBorde = enviada ? '#1a7a3a' : (foto ? '#1a7a3a' : '#0d1f4e');
  const colorFondo = enviada ? '#c8ecd4' : (foto ? '#eaf7ee' : '#c6dbf5');

  return (
    <div>
      <input
        ref={inputRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onSacar(f); e.target.value = ''; }}
      />
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          height: ALTO_BOTON, borderRadius: 8, border: `1.5px solid ${colorBorde}`,
          background: colorFondo, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'default' : 'pointer', overflow: 'hidden', position: 'relative', padding: '0 6px',
        }}
      >
        {enviada ? (
          // Bug real corregido: antes esto se dibujaba ENCIMA del label
          // ("FOTO LOCAL"/"FOTO VISITA"), con fondo semitransparente — se
          // veían los 2 textos superpuestos y mezclados. Ahora "ENVIADA" es
          // el ÚNICO contenido en este estado, sin nada de fondo debajo.
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1a7a3a' }}>✓ ENVIADA</span>
        ) : url ? (
          <>
            <img src={url} alt={label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1a7a3a' }}>
              ✓ CARGADA
            </div>
          </>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0d1f4e', textTransform: 'uppercase', lineHeight: 1.2, textAlign: 'center' }}>{label}</span>
        )}
      </div>
    </div>
  );
}

// Punto: las fotos de Formación 5 Iniciales (Local/Visita) — se sacan acá,
// quedan guardadas en el celular (IndexedDB, no se pierden si se cierra la
// app por una llamada u otra cosa antes de enviarlas), y se mandan las 2
// juntas por WhatsApp cuando estén listas. Al enviarlas con éxito, se
// borran solas (ya cumplieron su función).
export default function FotosFormacionInicial({ partidoId, local, visitante }) {
  const [fotoLocal, setFotoLocal] = useState(null);
  const [fotoVisita, setFotoVisita] = useState(null);
  const [enviadaLocal, setEnviadaLocal] = useState(false);
  const [enviadaVisita, setEnviadaVisita] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!partidoId) return;
    obtenerFotosFormacion(partidoId).then(({ local: l, visita: v }) => {
      setFotoLocal(l);
      setFotoVisita(v);
    }).catch(() => {});
  }, [partidoId]);

  // Bug real corregido: al sacar la foto, el celular se cerraba solo con
  // un cartel de "memoria insuficiente" — la foto de la cámara (10-20 MB,
  // resolución completa) se guardaba y mostraba tal cual, sin comprimir.
  // Ahora se redimensiona/recomprime ANTES de guardarla en cualquier lado.
  // Si por algún motivo la compresión falla (navegador raro, etc.), se
  // sigue guardando el archivo original — mejor eso que perder la foto.
  const sacarFoto = async (lado, archivoOriginal) => {
    setError('');
    let archivo = archivoOriginal;
    try {
      archivo = await comprimirImagen(archivoOriginal);
    } catch {
      // sigue con el original si la compresión no anduvo
    }
    try {
      await guardarFoto(partidoId, lado, archivo);
      if (lado === 'local') { setFotoLocal(archivo); setEnviadaLocal(false); }
      else { setFotoVisita(archivo); setEnviadaVisita(false); }
    } catch {
      setError('No se pudo guardar la foto. Probá de nuevo.');
    }
  };

  // Punto pedido: alcanza con UNA sola foto para poder enviar — no hace
  // falta esperar a tener las 2.
  const listasParaEnviar = fotoLocal || fotoVisita;

  const enviarPorWhatsApp = async () => {
    setEnviando(true);
    setError('');
    try {
      const archivos = [];
      if (fotoLocal) archivos.push(new File([fotoLocal], `Formacion_${local || 'Local'}.jpg`, { type: fotoLocal.type || 'image/jpeg' }));
      if (fotoVisita) archivos.push(new File([fotoVisita], `Formacion_${visitante || 'Visita'}.jpg`, { type: fotoVisita.type || 'image/jpeg' }));

      if (navigator.canShare && navigator.canShare({ files: archivos })) {
        await navigator.share({ files: archivos, title: 'Formación 5 Iniciales', text: `${local} vs ${visitante}` });
      } else {
        archivos.forEach(a => {
          const url = URL.createObjectURL(a);
          const link = document.createElement('a');
          link.href = url; link.download = a.name;
          document.body.appendChild(link); link.click(); document.body.removeChild(link);
          URL.revokeObjectURL(url);
        });
        alert('Tu celular no permite adjuntar las fotos directo desde acá. Se descargaron: adjuntalas manualmente en WhatsApp.');
      }
      // Punto pedido: las fotos NO se borran acá — se guardan por si hay
      // que volver a mandarlas a otra persona (delegado, coordinador,
      // etc.), hasta que el partido se finalice del todo. Recién ahí se
      // limpian (ver Pantalla5.jsx / App.jsx, al finalizar). Sí se marcan
      // como "enviada" (verde, punto pedido), para diferenciarlas de las
      // que todavía no se mandaron a nadie.
      if (fotoLocal) setEnviadaLocal(true);
      if (fotoVisita) setEnviadaVisita(true);
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setError('No se pudieron enviar las fotos. Probá de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .3 }}>
        Fotos de Planillas
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <CasilleroFoto label="Foto Local" foto={fotoLocal} enviada={enviadaLocal} onSacar={f => sacarFoto('local', f)} disabled={enviando} />
        <CasilleroFoto label="Foto Visita" foto={fotoVisita} enviada={enviadaVisita} onSacar={f => sacarFoto('visita', f)} disabled={enviando} />
        <button
          onClick={enviarPorWhatsApp} disabled={!listasParaEnviar || enviando}
          style={{
            height: ALTO_BOTON, borderRadius: 8, border: 'none',
            background: !listasParaEnviar ? '#e0e0e0' : (enviando ? '#8fa3c9' : '#1a7a3a'),
            color: !listasParaEnviar ? '#888' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.1, padding: '0 4px', textTransform: 'uppercase',
            cursor: !listasParaEnviar ? 'default' : (enviando ? 'wait' : 'pointer'),
          }}
        >
          {enviando ? 'Enviando...' : 'Enviar WSP'}
        </button>
      </div>
      {error && <div style={{ color: '#e03030', fontSize: 12, fontWeight: 600 }}>{error}</div>}
    </div>
  );
}
