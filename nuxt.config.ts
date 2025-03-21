import CleanCss from 'vite-plugin-clean-css';

// https://v3.nuxtjs.org/api/configuration/nuxt.config

const title = 'Alex Liu';
const description =
  'Front-end Web Developer from Taiwan | Work with Vue, Nuxt and React | Author of Vorms | Super fan for TypeScript';

export default defineNuxtConfig({
  compatibilityDate: '2025-03-21',

  modules: [
    '@nuxt/image',
    '@nuxt/content',
    '@unocss/nuxt',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@nuxtjs/sitemap',
    'nuxt-svgo-loader',
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
      // @see https://github.com/nuxt-modules/mdc/blob/v0.5.0/src/module.ts#L10-L24
      langs: [
        'js',
        'jsx',
        'json',
        'ts',
        'tsx',
        'vue',
        'css',
        'html',
        'vue',
        'bash',
        'md',
        'mdc',
        'yaml',

        // custom
        'diff',
      ],
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
      link: [
        // rss
        { rel: 'alternate', type: 'application/rss+xml', href: '/rss.xml' },
      ],
    },
  },

  css: ['@unocss/reset/tailwind.css', '@/assets/scss/style.scss'],

  colorMode: {
    classSuffix: '',
    preference: 'dark',
  },

  site: {
    url: 'https://mini-ghost.dev',
  },

  vite: {
    plugins: [
      CleanCss({
        level: {
          2: {
            mergeSemantically: true,
            restructureRules: true,
          },
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

  nitro: {
    prerender: {
      routes: ['/rss.xml'],
    },
  },

  svgoLoader: {
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
  },

  experimental: { componentIslands: true },
});
