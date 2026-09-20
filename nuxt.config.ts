export default defineNuxtConfig({
  compatibilityDate: '2026-09-20',

  ssr: false,

  css: [
    '~/assets/css/styles.css'
  ],

  modules: [
    '@vite-pwa/nuxt'
  ],

  pwa: {
    registerType: 'autoUpdate',

    manifest: {
      id: '/finanzuebersicht/',
      name: 'Finanzübersicht',
      short_name: 'Finanzen',
      description: 'Meine persönliche Finanzübersicht',

      start_url: '/finanzuebersicht/',
      scope: '/finanzuebersicht/',

      display: 'standalone',

      theme_color: '#111827',
      background_color: '#111827',

      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },

    workbox: {
      navigateFallback: '/finanzuebersicht/'
    }
  }
})