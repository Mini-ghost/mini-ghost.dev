<script setup lang="ts">
import { withoutTrailingSlash } from 'ufo';

import format from '@/helper/format';

const siteURL = useSiteURL();
const route = useRoute();

const { post, surround, fullPath } = await useProse(() =>
  withoutTrailingSlash(route.path)
);

const NuxtLink = resolveComponent('NuxtLink');
const shares = useProseShare({
  title: () => {
    return post.value.title ? `${post.value.title} | Alex Liu` : '';
  },
  path: fullPath,
});

useHead(() => {
  const content = post.value;
  if (content == null) return {};

  const title = `${content.title} | Alex Liu`;
  const description = content.description;

  let image = content.image;
  if (!image) {
    const titleEncoded = encodeURIComponent(content.title);

    const create = `${+new Date(content.created)}`;
    const query = new URLSearchParams({
      read: content.readingTime.text,
      create,
    });

    image = `https://og-image-mini-ghost.vercel.app/${titleEncoded}?${query}`;
  }

  return {
    title: content.title,

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
        name: 'twitter:image',
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
          description: content.description,
          datePublished: content.created,
          dateModified: content.created,
          author: {
            '@type': 'Person',
            name: 'Alex Liu',
            url: siteURL.value,
          },
          publisher: {
            '@type': 'Person',
            name: 'Alex Liu',
          },
          headline: title,
          image,
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
  <template v-if="post">
    <div class="lg:flex lg:w-fit w-11/12 mx-auto">
      <div class="hidden lg:flex space-y-2 flex-col sticky top-20 self-start mt-50">
        <template
          v-for="item in shares"
          :key="item.title"
        >
          <Component
            :is="item.attrs.to ? NuxtLink : 'button'"
            :aria-label="item.label"
            class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[--bg-code-block] hover:text-[#FFAC11]"
            v-bind="item.attrs"
          >
            <Component
              :is="item.icon"
              height="20"
              width="20"
            />
          </Component>
        </template>
      </div>
      <div class="lg:max-w-[calc(2rem+21cm)] lg:px-8 pb-16 lg:pb-32">
        <div class="prose">
          <header>
            <h1 class="mt-0 text-[1.75rem] lg:text-[2.25rem] leading-relaxed">
              <NuxtLink :to="post._path">
                {{ post.title }}
              </NuxtLink>
            </h1>
            <div class="text-sm text-gray/60">
              <time :datetime="post.created">
                {{ format(post.created, { timeZone: 'Asia/Taipei', year: 'numeric', month: 'short', day: 'numeric' }) }}
              </time>
              •
              <span>
                {{ post.readingTime.text }}
              </span>
            </div>

            <div class="flex gap-3 my-6">
              <template
                v-for="tag in post.tags"
                :key="tag"
              >
                <NuxtLink
                  class="opacity-50 hover:opacity-100"
                  :to="`/tags/${tag.replace(/\s/g, '-').toLowerCase()}`"
                >
                  #{{ tag }}
                </NuxtLink>
              </template>
            </div>

            <p>{{ post.description }}</p>
          </header>

          <ContentRenderer :value="post" />

          <h3>請我喝杯咖啡</h3>
          <p>如果這裡的內容有幫助到你的話，一杯咖啡就是對我最大的鼓勵。</p>

          <NuxtLink
            href="https://www.buymeacoffee.com/alex_minighost"
            target="_blank"
          >
            <ProseImg
              alt="請我喝杯咖啡"
              decoding="async"
              height="60"
              loading="lazy"
              src="https://cdn.buymeacoffee.com/buttons/v2/default-green.png"
              width="217"
            />
          </NuxtLink>
        </div>
        <div class="mt-16">
          <div class="grid grid-cols-2 gap-x-4 border-t border-white border-opacity-20 pt-8">
            <template v-if="surround && surround![0]">
              <NuxtLink
                class="text-start opacity-60 hover:opacity-100 transition-opacity"
                :to="surround![0]._path"
              >
                <span class="opacity-60">previous</span><br>
                {{ surround![0].title }}
              </NuxtLink>
            </template>


            <template v-if="surround && surround![1]">
              <NuxtLink
                class="text-end opacity-60 hover:opacity-100 transition-opacity"
                :to="surround![1]._path"
              >
                <span class="opacity-60">next</span><br>
                {{ surround![1].title }}
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </div>
  </template>
  <template v-else>
    <div class="max-w-21cm w-11/12 mx-auto pb-16 lg:pb-32">
      <span>
        NOT FONT | 
      </span>
      <NuxtLink
        class="font-bold"
        to="/posts"
      >
        cd..
      </NuxtLink>
    </div>
  </template>
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
    @apply ring-1 ring-gray/10 hover:ring-2 hover:ring-gray/30;
    @apply p-6;
    @apply rounded-2 overflow-x-auto;
    @apply transition-all duration-300;
  }

  code:not(pre > code) {
    @apply text-[90%];
    @apply text-[var(--c-text-code)];
    @apply bg-[var(--bg-code-inline)];
    @apply py-1 px-1.5;
    @apply rounded;
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
