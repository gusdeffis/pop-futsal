import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';

// Registra la app para uso offline y revisa si hay una versión nueva cada
// vez que se abre (por ejemplo, al volver de otra app). Si hay una nueva,
// la activa al instante (gracias a skipWaiting/clientsClaim).
const actualizarSW = registerSW({ immediate: true });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') actualizarSW();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
