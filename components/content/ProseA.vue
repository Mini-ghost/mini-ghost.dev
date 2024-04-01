<script setup lang="ts">
const props = defineProps<{
  href: string;
}>();

const isExternal = computed(() => props.href.startsWith('http'));
</script>

<template>
  <NuxtLink
    :to="props.href"
    :target="isExternal ? '_blank' : undefined"
    v-bind="$attrs"
  >
    <slot />
  </NuxtLink>
</template>
