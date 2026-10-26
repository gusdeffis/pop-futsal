import { useEffect, useRef, useState } from 'react';
import { calcularDimensionesCaptura, reducirCalidadHastaTamano } from '../utils/capturarFotoCamara';

// Punto pedido: en vez de abrir la app de Cámara nativa del celular (que
// es pesada, y hace que el navegador quede en segundo plano — sospecha
// principal de por qué Android a veces mataba la pestaña), la cámara se
// abre DENTRO de esta misma pantalla, con getUserMedia — el navegador
// nunca pasa a segundo plano en ningún momento del proceso.
export default function CamaraEnPagina({ onCapturar, onCancelar, maxDimension = 1920, pesoObjetivoBytes = 1_500_000 }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [capturando, setCapturando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        // Bug real detectado: sin pedir una resolución explícita, el
        // navegador puede entregar un video de baja resolución por
        // defecto (ej. 640x480) — la foto capturada sale "pixelada/en
        // bloques" no por la compresión final, sino porque la imagen de
        // ORIGEN ya viene chica. Se pide explícitamente una resolución
        // alta (Full HD como mínimo ideal); si el celular no la tiene
        // disponible, el navegador entrega la máxima que sí tenga.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 2560 }, height: { ideal: 1440 },
          },
          audio: false,
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
      let blob = await capturarConImageCapture();
      if (!blob) blob = await capturarDesdeVideo();
      onCapturar(blob);
    } catch {
      setError('No se pudo capturar la foto. Probá de nuevo.');
    } finally {
      setCapturando(false);
    }
  };

  // Punto pedido: subir la calidad/resolución del video en sí no alcanzó
  // — el video de getUserMedia está pensado para streaming en vivo (baja
  // latencia), no para fotos nítidas, y suele venir peor que la foto real
  // que saca la cámara nativa. ImageCapture.takePhoto() accede al canal
  // de FOTO real de la cámara (el mismo que usa la app nativa) en vez del
  // canal de video — mucha más nitidez real. Se intenta primero; si el
  // navegador no lo soporta, cae al método de siempre (capturarDesdeVideo).
  const capturarConImageCapture = async () => {
    if (typeof ImageCapture === 'undefined') return null;
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return null;
    try {
      const imageCapture = new ImageCapture(track);
      const fotoOriginal = await imageCapture.takePhoto();
      // La foto real de la cámara puede venir a resolución muy alta (bastante
      // más que lo necesario) — se redimensiona igual que en
      // comprimirImagen.js: el navegador achica DURANTE la decodificación
      // misma, sin nunca materializar la imagen a resolución completa en
      // memoria (mismo motivo por el que evitamos "memoria insuficiente"
      // antes).
      const miniatura = await createImageBitmap(fotoOriginal, { resizeWidth: 200 });
      const proporcion = miniatura.height / miniatura.width;
      miniatura.close?.();
      const ancho = proporcion >= 1 ? Math.round(maxDimension / proporcion) : maxDimension;
      const alto = proporcion >= 1 ? maxDimension : Math.round(maxDimension * proporcion);
      const bitmap = await createImageBitmap(fotoOriginal, { resizeWidth: ancho, resizeHeight: alto, resizeQuality: 'high' });
      try {
        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, ancho, alto);
        const generarBlob = (calidad) => new Promise((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('sin blob'))), 'image/jpeg', calidad);
        });
        return await reducirCalidadHastaTamano(generarBlob, { targetBytes: pesoObjetivoBytes });
      } finally {
        bitmap.close?.();
      }
    } catch {
      return null; // si ImageCapture falla en este dispositivo, cae al plan B
    }
  };

  // Plan B (el método anterior): toma un cuadro del <video> en vivo. Se
  // usa solo si ImageCapture no está disponible o falla en el celular.
  const capturarDesdeVideo = async () => {
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
    return reducirCalidadHastaTamano(generarBlob, { targetBytes: pesoObjetivoBytes });
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
