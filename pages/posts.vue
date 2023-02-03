

<script setup lang="ts">
const posts = await(await queryContent('/posts').find())
  .filter(item => !!item._path)
  .map(item => ({
    path: item._path,
    title: item.title,
  }));
</script>

<template>
  <div>
    <ol>
      <li
        v-for="post in posts"
        :key="post.path"
      >
        <NuxtLink :to="post.path">
          {{ post.title }}
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>
