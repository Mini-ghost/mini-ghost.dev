<script setup lang="ts">
const props = defineProps<{
  href: string;
}>();

const isExternal = computed(() => props.href.startsWith('http'));
</script>

<template>
  <NuxtLink
    :target="isExternal ? '_blank' : undefined"
    :to="props.href"
    v-bind="$attrs"
  >
    <slot />
  </NuxtLink>
</template>
