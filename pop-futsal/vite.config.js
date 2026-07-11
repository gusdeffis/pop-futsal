import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
        globPatterns: ['**/*.{js,css,html,png,svg,ico,pdf}'],
      },
    }),
  ],
});
