// https://v3.nuxtjs.org/api/configuration/nuxt.config

const title = 'Alex Liu';
const description =
  'Front-end Web Developer from Taiwan | Work with Vue, Nuxt and React | Author of Vorms | Super fan for TypeScript';

export default defineNuxtConfig({
  modules: ['@nuxt/content', '@unocss/nuxt', '@nuxtjs/color-mode'],
  content: {
    highlight: {
      theme: {
        dark: 'github-dark-dimmed',
        default: 'github-light',
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
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        { name: 'twitter:title', content: title },
        {
          name: 'twitter:description',
          content: description,
        },
      ],
    },
  },

  css: ['@unocss/reset/tailwind.css', '@/assets/scss/style.scss'],

  colorMode: {
    classSuffix: '',
    preference: 'dark',
  },
});
