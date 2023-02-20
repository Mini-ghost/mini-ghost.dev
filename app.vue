<script setup lang="ts">
useHead(() => ({
  titleTemplate: title => (title ? `${title} | Alex Liu` : ''),
}));
</script>

<template>
  <div>
    <NavBar />
    <main>
      <NuxtPage />
    </main>
  </div>
</template>
