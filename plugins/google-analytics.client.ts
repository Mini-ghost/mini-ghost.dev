// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: any[]) {
  // eslint-disable-next-line prefer-rest-params
  (window as any).dataLayer.push(arguments);
}

const INITIAL_EVENT = [
  'mousemove',
  'scroll',
  'keydown',
  'click',
  'touchstart',
  'wheel',
];

export default defineNuxtPlugin(nuxtApp => {
  // 如果是在開發中則跳過
  if (process.env.NODE_ENV !== 'production') return;

  const { googleTagId } = useRuntimeConfig().public;

  const initialed = ref(false);

  useHead(() => {
    if (!initialed.value) return {};

    return {
      script: [
        {
          async: true,
          src: `https://www.googletagmanager.com/gtag/js?id=${googleTagId}`,
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

  // @ts-expect-error: `dataLayer` is not defined
  window.dataLayer = window.dataLayer || [];

  gtag('js', new Date());
  gtag('config', googleTagId);
});
