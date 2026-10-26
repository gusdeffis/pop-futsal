import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Bug real corregido: con 'autoUpdate' el service worker se
      // actualizaba solo en segundo plano, compitiendo con nuestro propio
      // cartel de "hay una versión nueva" — a veces el cartel no llegaba a
      // aparecer, y hacía falta F5 varias veces hasta que la actualización
      // automática silenciosa terminara de aplicarse sola. Con 'prompt',
      // el aviso manual (avisoActualizacion.js) queda a cargo de verdad.
      registerType: 'prompt',
      includeAssets: ['icon-192.png', 'icon-512.png', 'plantilla_popa.pdf'],
      manifest: {
        name: 'Planilla Oficial de Partido Futsal',
        short_name: 'Planilla Oficial de Partido Futsal',
        description: 'Planilla Oficial de Partido - AFA Futsal',
        theme_color: '#0d1f4e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Bug real corregido: el HTML principal quedaba en el precache
        // "cache first" de siempre — el navegador podía seguir sirviendo
        // una copia vieja del shell de la app en vez de ir a buscar la
        // nueva, incluso con un service worker más nuevo ya instalado por
        // detrás. Se saca 'html' de acá (deja de precachearse así) y se
        // agrega abajo con una estrategia distinta, que sí revisa la red
        // primero en cada carga.
        globPatterns: ['**/*.{js,css,png,svg,ico,pdf}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // El documento HTML principal: siempre intenta traer la
            // versión más fresca de internet primero — solo si no hay
            // conexión, recién ahí usa la última copia guardada.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'html-cache', networkTimeoutSeconds: 4 },
          },
        ],
      },
    }),
  ],
});
