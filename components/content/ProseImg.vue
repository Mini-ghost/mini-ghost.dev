<script setup lang="ts">
import { hasProtocol, withBase } from 'ufo';

import { computed, useRuntimeConfig } from '#imports';

const props = withDefaults(
  defineProps<{
    src: string;
    alt: string;
    width: `${number}` | number;
    height: `${number}` | number;
    loading?: 'lazy' | 'eager';
    decoding?: 'async' | 'auto' | 'sync';
  }>(),
  {
    loading: 'lazy',
    decoding: 'async',
  }
);

const { app } = useRuntimeConfig();

const isExternal = computed(() => {
  const { src } = props;
  return hasProtocol(src) || src.startsWith('//');
});
</script>

<template>
  <NuxtImg
    v-if="!isExternal"
    :alt="alt"
    :decoding="decoding"
    :height="height"
    :loading="loading"
    :src="withBase(src, app.baseURL)"
    :width="width"
  />
  <img
    v-else
    :alt="alt"
    :decoding="decoding"
    :height="height"
    :loading="loading"
    :src="src"
    :width="width"
  >
</template>
