<script setup lang="ts">
const { data: page } = await useAsyncData('HOME', () =>
  queryContent()
    .where({
      _path: {
        $eq: '/',
      },
    })
    .findOne()
);
</script>

<template>
  <main>
    <pre>{{ page }}</pre>
  </main>
</template>
