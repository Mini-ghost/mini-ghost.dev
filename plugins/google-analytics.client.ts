// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: any[]) {
  // eslint-disable-next-line prefer-rest-params
  (window as any).dataLayer.push(arguments);
}

export default defineNuxtPlugin(() => {
  const { googleTagId } = useRuntimeConfig().public;

  onNuxtReady(() => {
    useHead({
      script: [
        {
          async: true,
          src: `https://www.googletagmanager.com/gtag/js?id=${googleTagId}`,
        },
      ],
    });

    // @ts-expect-error: `dataLayer` is not defined
    window.dataLayer = window.dataLayer || [];

    gtag('js', new Date());
    gtag('config', googleTagId);
  });
});
