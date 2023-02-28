<script setup lang="ts">
useHead(() => ({
  titleTemplate: title => (title ? `${title} | Alex Liu` : ''),
}));
</script>

<template>
  <NavBar />
  <main>
    <NuxtPage />
  </main>
</template>
