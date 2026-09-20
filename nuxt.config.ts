export default defineNuxtConfig({
  compatibilityDate: '2026-09-20',

  css: [
    '~/assets/css/styles.css'
  ],

  app: {
    head: {
      link: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon.svg'
        }
      ]
    }
  },
  modules: [
    '@vite-pwa/nuxt'
  ],

  pwa: {
    registerType: 'autoUpdate',

    manifest: {
      name: 'Finanzübersicht',
      short_name: 'Finanzen',
      description: 'Meine persönliche Finanzübersicht',
      theme_color: '#111827',
      background_color: '#111827',
      display: 'standalone',

      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  }
})