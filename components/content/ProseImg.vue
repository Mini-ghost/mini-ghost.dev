

<script setup lang="ts">
import { hasProtocol, withBase } from 'ufo';

import { computed, useRuntimeConfig } from '#imports';

const props = withDefaults(
  defineProps<{
    src: string;
    alt: string;
    width: string | number;
    height: string | number;
    loading?: string;
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
    :src="withBase(src, app.baseURL)"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="loading"
    :decoding="decoding"
  />
  <img
    v-else
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="loading"
    :decoding="decoding"
  >
</template>
