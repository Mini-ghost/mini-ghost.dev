import SvgLoader from 'vite-svg-loader';

// https://v3.nuxtjs.org/api/configuration/nuxt.config

const title = 'Alex Liu';
const description =
  'Front-end Web Developer from Taiwan | Work with Vue, Nuxt and React | Author of Vorms | Super fan for TypeScript';

export default defineNuxtConfig({
  modules: [
    '@nuxt/image',
    '@nuxt/content',
    '@unocss/nuxt',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    'nuxt-simple-sitemap',
  ],

  content: {
    markdown: {
      // https://github.com/nuxt/content/issues/1231#issuecomment-1149871306
      remarkPlugins: ['remark-reading-time'],
    },
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

        // google
        {
          name: 'google-site-verification',
          content: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      ],
    },
  },

  css: ['@unocss/reset/tailwind.css', '@/assets/scss/style.scss'],

  colorMode: {
    classSuffix: '',
    preference: 'dark',
  },

  vite: {
    plugins: [
      SvgLoader({
        svgoConfig: {
          plugins: [
            'removeXMLNS',
            {
              name: 'removeAttrs',
              params: {
                attrs: 'fill',
              },
            },
            {
              name: 'addAttributesToSVGElement',
              params: {
                attribute: {
                  'aria-hidden': 'true',
                  fill: 'currentColor',
                },
              },
            },
          ],
        },
      }),
    ],
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
      siteURL: process.env.NUXT_PUBLIC_SITE_URL,
      googleTagId: process.env.NUXT_PUBLIC_GOOGLE_TAG_ID,
    },
  },

  sitemap: {},

  experimental: { componentIslands: true },
});
