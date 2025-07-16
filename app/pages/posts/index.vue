<script setup lang="ts">
import format from '@/helper/format';

const { posts } = await usePosts();
const siteURL = useSiteURL();

const title = 'Blog';
const description =
  '嗨！我是 Alex Liu，這裡記錄了我自己技術開發上的一些心得、過程。目前主要開發以 Vue.js 搭配 TypeScript 為主，是一個追求有趣技術的偏執狂！';

useHead(() => {
  const items = posts.value?.flatMap(({ posts }) => posts) ?? [];
  const person = {
    '@type': 'Person',
    name: 'Alex Liu',
    url: siteURL.value,
  };

  const transformImage = (title: string, created: string, read: string) => {
    const titleEncoded = encodeURIComponent(title);

    const create = `${+new Date(created)}`;
    const query = new URLSearchParams({
      read,
      create,
    });

    return `https://og-image-mini-ghost.vercel.app/${titleEncoded}?${query}`;
  };

  return {
    title,

    meta: [
      {
        name: 'description',
        content: description,
      },
      {
        property: 'og:title',
        content: `${title} | Alex Liu`,
      },
      {
        property: 'og:description',
        content: description,
      },
      {
        name: 'twitter:title',
        content: `${title} | Alex Liu`,
      },
      {
        name: 'twitter:description',
        content: description,
      },
    ],

    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'http://schema.org',
          '@type': 'Blog',
          blogPost: items.map(post => ({
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,

            image: transformImage(
              post.title,
              post.created,
              post.readingTime.text
            ),

            datePublished: post.created,
            dateModified: post.created,
            author: person,
            publisher: person,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `${siteURL.value}${post.path}`,
            },
          })),
        }),
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
    
    <div
      v-for="group in posts"
      :key="group.year"
    >
      <div class="relative h-20 pointer-events-none select-none">
        <span class="absolute -top-5 -left-5 text-[8rem] font-bold opacity-8">
          {{ group.year }}
        </span>
      </div>
      <ul class="space-y-6">
        <li
          v-for="post in group.posts"
          :key="post.path"
        >
          <NuxtLink
            class="opacity-80 lg:opacity-60 transition-opacity duration-300 focus:opacity-100 hover:opacity-100 focus:outline-none "
            :to="post.path"
          >
            <span class="text-lg w-fit">
              {{ post.title }}
            </span>
            <br>
            <span class="text-sm opacity-70">
              <time :datetime="post.created">
                {{ format(post.created) }}
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
  </div>
</template>
