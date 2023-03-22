// https://v3.nuxtjs.org/api/configuration/nuxt.config

const title = 'Alex Liu';
const description =
  'Front-end Web Developer from Taiwan | Work with Vue, Nuxt and React | Author of Vorms | Super fan for TypeScript';

export default defineNuxtConfig({
  modules: [
    '@nuxt/image-edge',
    '@nuxt/content',
    '@unocss/nuxt',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    'nuxt-simple-sitemap',
  ],

  content: {
    highlight: {
      theme: {
        dark: 'vitesse-dark',
        default: 'vitesse-light',
      },
    },
  },

  app: {
    head: {
      title,
      htmlAttrs: {
        lang: 'zh-TW',
      },
      meta: [
        { name: 'description', content: description },

        // og
        { property: 'og:type', content: 'profile' },
        { property: 'og:locale', content: 'zh_TW' },

        // twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    },
  },

  css: ['@unocss/reset/tailwind.css', '@/assets/scss/style.scss'],

  colorMode: {
    classSuffix: '',
    preference: 'dark',
  },

  vite: {
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `_nuxt/main.[hash].js`,
          chunkFileNames: `_nuxt/[hash].js`,
          assetFileNames: `_nuxt/[hash].[ext]`,
        },
      },
    },
  },

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
    },
  },

  sitemap: {
    trailingSlash: true,
  },

  experimental: { componentIslands: true },
});
