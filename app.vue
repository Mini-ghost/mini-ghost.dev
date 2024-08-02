<script setup lang="ts">
const route = useRoute();
const siteURL = useSiteURL(() => route.path);

useHead(() => ({
  titleTemplate: title => (title ? `${title} | Alex Liu` : ''),

  link: [
    {
      rel: 'canonical',
      href: siteURL.value,
    },
  ],
}));
</script>

<template>
  <LayoutNavigation />
  <main>
    <NuxtPage />
  </main>
</template>
