<script setup lang="ts">
/**
 * Tweet component
 * @see https://developer.twitter.com/en/docs/twitter-for-websites/javascript-api/overview
 */

const tweet = ref<HTMLElement>();

onMounted(() => {
  // @ts-expect-error cdn
  if (!window.twttr) {
    const scriptId = 'twitter-wjs';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');

      script.src = 'https://platform.twitter.com/widgets.js';
      script.id = scriptId;
      script.async = true;

      document.head.appendChild(script!);
    }

    script.addEventListener('load', () => {
      // @ts-expect-error cdn
      window.twttr.widgets.load(tweet.value);
    });
  } else {
    // @ts-expect-error cdn
    window.twttr.widgets.load(tweet.value);
  }
});
</script>

<template>
  <div class="flex items-center justify-center">
    <blockquote
      ref="tweet"
      class="twitter-tweet"
      data-conversation="none"
      data-theme="dark"
    >
      <slot />
    </blockquote>
  </div>
</template>

<style>
.twitter-tweet {
  color-scheme: light;
}
</style>
