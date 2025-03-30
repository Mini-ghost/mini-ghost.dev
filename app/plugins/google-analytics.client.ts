function gtag(...args: any[]) {
  window.dataLayer.push(args);
}

const INITIAL_EVENT = [
  'mousemove',
  'scroll',
  'keydown',
  'click',
  'touchstart',
  'wheel',
];

export default defineNuxtPlugin({
  parallel: true,
  setup(nuxtApp) {
    if (import.meta.env.DEV) return
  
    const { googleTagId } = useRuntimeConfig().public;
    
    const initialed = shallowRef(false);
    const source = `https://www.googletagmanager.com/gtag/js?id=${googleTagId}`;
  
    useHead({
      link: [
        {
          rel: 'preload',
          as: 'script',
          href: source,
        }
      ]
    })
  
    useHead(() => {
      if (!initialed.value) return {};
      return {
        script: [
          {
            async: true,
            src: source,
          },
        ],
      };
    });
  
    nuxtApp.hooks.hook('app:created', () => {
      const controller = new AbortController();
  
      const handler = () => {
        initialed.value = true;
        INITIAL_EVENT.forEach(name => {
          window.removeEventListener(name, handler);
        });
      };
  
      INITIAL_EVENT.forEach(event => {
        window.addEventListener(event, handler, {
          capture: true,
          once: true,
          passive: true,
          signal: controller.signal,
        });
      });
    });
  
    window.dataLayer ||= [];
  
    gtag('js', new Date());
    gtag('config', googleTagId);
  }
});

declare global {
  interface Window {
    dataLayer: Record<string, any>
  }
}