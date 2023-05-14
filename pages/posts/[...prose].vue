<script setup lang="ts">
import { withoutTrailingSlash } from 'ufo';

import format from '@/helper/format';

const route = useRoute();
const { post, surround, fullPath } = await useProse(() =>
  withoutTrailingSlash(route.path)
);

useHead(() => {
  const content = post.value;
  if (content == null) return {};

  const title = `${post.value.title} | Alex Liu`;
  const description = post.value.description;
  const image = post.value.image;

  return {
    title,
    meta: [
      {
        name: 'description',
        content: description,
      },

      // og
      {
        property: 'og:title',
        content: title,
      },
      {
        property: 'og:description',
        content: description,
      },
      {
        property: 'og:image',
        content: image,
      },
      {
        property: 'og:url',
        content: fullPath.value,
      },
      {
        property: 'og:type',
        content: 'article',
      },

      // twitter
      {
        name: 'twitter:title',
        content: title,
      },
      {
        name: 'twitter:description',
        content: description,
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:image:src',
        content: image,
      },
      {
        name: 'twitter:url',
        content: fullPath.value,
      },
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'http://schema.org',
          '@type': 'BlogPosting',
          description: post.value.description,
          datePublished: post.value.created,
          dateModified: post.value.created,
          author: {
            '@type': 'Person',
            name: 'Alex Liu（Han-Zhang Liu）',
          },
          publisher: {
            '@type': 'Organization',
            name: post.value.title,
          },
          headline: post.value.title,
          image: post.value.image,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': fullPath.value,
          },
        }),
      },
    ],
  };
});
</script>

<template>
  <div>
    <template v-if="post">
      <div class="prose max-w-21cm w-11/12 mx-auto">
        <header>
          <h1 class="mt-0 text-[1.75rem] lg:text-[2.25rem] leading-relaxed">
            <NuxtLink :to="post._path">
              {{ post.title }}
            </NuxtLink>
          </h1>
          <div class="text-sm text-gray/60">
            <time :datetime="post.created">
              {{ format(post.created) }}
            </time>
            •
            <span>
              {{ post.readingTime.text }}
            </span>
          </div>
          <p>{{ post.description }}</p>
        </header>

        <ContentRenderer :value="post" />
      </div>
      <div class="max-w-21cm w-11/12 mx-auto mt-16 pb-16 lg:pb-32">
        <div class="grid grid-cols-2 gap-x-4 border-t border-white border-opacity-20 pt-8">
          <template v-if="surround && surround![0]">
            <NuxtLink
              :to="surround![0]._path"
              class="text-start opacity-60 hover:opacity-100 transition-opacity"
            >
              <span class="opacity-60">previous</span><br>
              {{ surround![0].title }}
            </NuxtLink>
          </template>


          <template v-if="surround && surround![1]">
            <NuxtLink
              :to="surround![1]._path"
              class="text-end opacity-60 hover:opacity-100 transition-opacity"
            >
              <span class="opacity-60">next</span><br>
              {{ surround![1].title }}
            </NuxtLink>
          </template>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="max-w-21cm w-11/12 mx-auto pb-16 lg:pb-32">
        <span>
          NOT FONT | 
        </span>
        <NuxtLink
          to="/posts"
          class="font-bold"
        >
          cd..
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style lang="scss">
.prose {
  @apply leading-loose;

  h1,
  h2,
  h3 {
    @apply font-bold;
  }

  h1 {
    @apply mt-8 mb-4;
  }

  h2,
  h3 {
    @apply table;
    @apply -mt-12 mb-4 pt-20;
  }

  h2 {
    @apply text-2xl lg:text-3xl;
  }

  h3 {
    @apply text-xl lg:text-2xl;
  }

  :is(p, pre) {
    @apply my-4;
  }

  p {
    @apply my-6;
  }

  :not(h1, h2, h3) > a {
    @apply underline decoration-1 decoration-dashed underline-offset-6;
    @apply hover:text-[#FFAC11];
  }

  hr {
    @apply my-10 border-t-2 opacity-10;
  }

  blockquote,
  pre {
    @apply transition-colors duration-500 my-6;
  }

  blockquote {
    @apply border border-[#10B981]/30 bg-[#10B981]/5 p-4 rounded hover:border-[#10B981]/50;
  }

  blockquote p {
    @apply my-0;
  }

  pre {
    @apply text-sm;
    @apply bg-[var(--bg-code-block)];
    @apply border border-solid border-gray/10 hover:border-gray/30;
    @apply p-4;
    @apply rounded-2 overflow-x-auto;
  }

  :not(pre) > code {
    @apply text-[var(--c-text-code)];
    @apply bg-[var(--bg-code-inline)];
    @apply py-1 px-1.5;
    @apply rounded;
  }

  :not(pre, h1, h2, h3, h4, h5, h6) > code {
    @apply text-[0.785rem];
  }

  ul,
  ol {
    @apply ps-5;
  }

  ul {
    @apply list-disc;
  }

  ol {
    @apply list-decimal;
  }

  li {
    @apply my-2;
    @apply marker:text-gray/60;
  }

  table {
    @apply block;
    @apply border-collapse;
    @apply overflow-x-auto;
    @apply my-5;
  }

  th {
    @apply text-sm;
    @apply font-bold;
    @apply bg-[var(--bg-soft)];
  }

  tr {
    @apply border-t border-[var(--c-divider)];
  }

  :is(th, td) {
    @apply border border-[var(--c-divider)];
    @apply py-2 px-4;
  }
}
</style>
