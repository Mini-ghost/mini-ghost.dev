<script setup lang="ts">
interface ContentMetaProps {
  title: string;
  description: string;
  image: string;
}

defineProps<ContentMetaProps>();
</script>

<template>
  <Meta
    name="twitter:title"
    :content="`${title} | Alex Liu`"
  />
  <Meta
    name="twitter:description"
    :content="description"
  />
  <Meta
    name="twitter:image:src"
    :content="image"
  />
</template>
