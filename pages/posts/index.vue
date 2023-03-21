<script setup lang="ts">
import format from '@/helper/format';

interface Post {
  _path: string;
  title: string;
  created: string;
}

useHead(() => ({
  title: 'Blog',
}));

const { data: posts } = await useAsyncData(
  'QUERY_POSTS',
  () =>
    queryContent('/posts/')
      .where({ _partial: false })
      .only(['_path', 'title', 'created'])
      .sort({ created: -1 })
      .find() as Promise<Post[]>,
  {
    transform(result) {
      const posts: { year: string; posts: Post[] }[] = [];

      let group: Post[] = [];
      let year: string | null = null;

      result.forEach(item => {
        let current: string;
        if (
          (current = item.created.slice(0, 4)) !== year &&
          typeof year === 'string'
        ) {
          posts.push({
            year,
            posts: group,
          });

          group = [];
        }

        year = current;
        group.push(item);
      });

      if (typeof year === 'string' && group.length) {
        posts.push({
          year,
          posts: group,
        });
      }

      return posts;
    },
  }
);
</script>

<template>
  <div class="max-w-21cm w-11/12 mx-auto space-y-6 lg:pt-16 pb-16 lg:pb-32">
    <div
      v-for="group in posts"
      :key="group.year"
    >
      <div class="relative h-20 pointer-events-none">
        <span class="absolute -top-5 -left-5 text-[8rem] font-bold opacity-08">
          {{ group.year }}
        </span>
      </div>
      <ul class="space-y-6">
        <li
          v-for="post in group.posts"
          :key="post._path"
        >
          <NuxtLink
            :to="post._path"
            class="opacity-80 lg:opacity-60 transition-opacity duration-300 focus:opacity-100 hover:opacity-100 focus:outline-none "
          >
            <span class="text-lg w-fit">
              {{ post.title }}
            </span>
            <br>
            <time
              :datetime="post.created"
              class="text-sm opacity-70"
            >
              {{ format(post.created, { month: 'short', day: 'numeric' }) }}
            </time>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
