import { useEffect, useRef, useState } from 'react';
import { calcularDimensionesCaptura, reducirCalidadHastaTamano } from '../utils/capturarFotoCamara';

// Punto pedido: en vez de abrir la app de Cámara nativa del celular (que
// es pesada, y hace que el navegador quede en segundo plano — sospecha
// principal de por qué Android a veces mataba la pestaña), la cámara se
// abre DENTRO de esta misma pantalla, con getUserMedia — el navegador
// nunca pasa a segundo plano en ningún momento del proceso.
export default function CamaraEnPagina({ onCapturar, onCancelar, maxDimension = 1280, pesoObjetivoBytes = 1_000_000 }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [capturando, setCapturando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false,
        });
        if (cancelado) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setListo(true);
        }
      } catch {
        // No se pudo acceder a la cámara (permiso denegado, sin cámara
        // disponible, etc.) — se avisa y se deja volver atrás para que se
        // use el otro camino (cámara nativa) si hace falta.
        setError('No se pudo acceder a la cámara. Revisá los permisos del navegador, o cerrá esto y probá de nuevo.');
      }
    })();
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capturar = async () => {
    if (!videoRef.current || capturando) return;
    setCapturando(true);
    try {
      const video = videoRef.current;
      const { ancho, alto } = calcularDimensionesCaptura(video.videoWidth, video.videoHeight, maxDimension);
      const canvas = document.createElement('canvas');
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, ancho, alto);

      const generarBlob = (calidad) => new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la foto'))),
          'image/jpeg', calidad
        );
      });
      const blob = await reducirCalidadHastaTamano(generarBlob, { targetBytes: pesoObjetivoBytes });
      onCapturar(blob);
    } catch {
      setError('No se pudo capturar la foto. Probá de nuevo.');
    } finally {
      setCapturando(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {error ? (
        <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{error}</div>
          <button onClick={onCancelar} style={{
            height: 48, background: '#fff', color: '#0d1f4e', border: 'none', borderRadius: 8,
            fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '0 24px',
          }}>
            Cerrar
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef} playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {!listo && (
            <div style={{ position: 'absolute', color: '#fff', fontSize: 15, fontWeight: 600 }}>
              Abriendo cámara...
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 16px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(transparent, rgba(0,0,0,.6))',
          }}>
            <button onClick={onCancelar} disabled={capturando} style={{
              width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.2)',
              color: '#fff', border: '1.5px solid #fff', fontSize: 20, fontWeight: 700, cursor: 'pointer',
            }}>
              ✕
            </button>
            <button onClick={capturar} disabled={!listo || capturando} style={{
              width: 72, height: 72, borderRadius: '50%', background: '#fff',
              border: '4px solid rgba(255,255,255,.5)', cursor: (!listo || capturando) ? 'wait' : 'pointer',
            }} aria-label="Capturar foto" />
            <div style={{ width: 52 }} />
          </div>
        </>
      )}
    </div>
  );
}
