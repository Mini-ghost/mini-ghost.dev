<script setup lang="ts">
import format from '@/helper/format';

const route = useRoute();
const { data } = await useTags(route.params.tags as string);

if (!data.value) {
  navigateTo('/404');
}

const title = computed(() => `Tag：${data.value?.title}`);
const description = computed(
  () => `共有 ${data.value?.posts.length} 篇與 ${data.value?.title} 相關的文章`
);

useHead(() => {
  return {
    title: title.value,
    meta: [
      {
        name: 'description',
        content: description.value,
      },
      {
        property: 'og:title',
        content: `${title.value} | Alex Liu`,
      },
      {
        property: 'og:description',
        content: description,
      },
      {
        name: 'twitter:title',
        content: `${title.value} | Alex Liu`,
      },
      {
        name: 'twitter:description',
        content: description.value,
      },
    ],
  };
});
</script>

<template>
  <div class="max-w-21cm w-11/12 mx-auto space-y-4 lg:space-y-6 lg:pt-16 pb-16 lg:pb-32">
    <h1 class="text-3xl lg:text-5xl font-bold">
      {{ title }}
    </h1>

    <p class="opacity-50 leading-loose">
      {{ description }}
    </p>

    <ul class="space-y-6">
      <li
        v-for="post in data?.posts"
        :key="post._path"
      >
        <NuxtLink
          class="opacity-80 lg:opacity-60 transition-opacity duration-300 focus:opacity-100 hover:opacity-100 focus:outline-none "
          :to="post._path"
        >
          <span class="text-lg w-fit">
            {{ post.title }}
          </span>
          <br>
          <span class="text-sm opacity-70">
            <time :datetime="post.created">
              {{ format(post.created, { month: 'short', day: 'numeric' }) }}
            </time>
            •
            <span>
              {{ post.readingTime.text }}
            </span>
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
