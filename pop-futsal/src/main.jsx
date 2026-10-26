import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { mostrarAvisoActualizacion } from './utils/avisoActualizacion';

const actualizarSW = registerSW({
  immediate: true,
  onNeedRefresh() { mostrarAvisoActualizacion(actualizarSW); },
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') actualizarSW();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
