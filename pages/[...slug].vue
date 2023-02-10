<script setup lang="ts">
import useFormat from '@/composiables/format';

interface Prose {
  title: string;
  description: string;
  created: string;
}

const route = useRoute();

const { data: prose } = await useAsyncData(
  route.path,
  () =>
    queryContent()
      .where({
        _path: {
          $eq: route.path,
        },
      })
      .only(['title', 'description', 'created'])
      .findOne() as Promise<Prose>
);

const created = useFormat(() => {
  return prose.value != null ? new Date(prose.value.created) : null;
});
</script>

<template>
  <div class="prose max-w-21cm w-11/12 mx-auto">
    <template v-if="prose">
      <h1 class="mt-0">
        <NuxtLink :to="route">
          {{ prose.title }}
        </NuxtLink>
      </h1>
      <div>
        <time
          class="text-sm text-gray/60"
          :datatype="prose.created"
        >
          {{ created }}
        </time>
      </div>
      <p>{{ prose.description }}</p>
      <ContentDoc />
    </template>
  </div>
</template>

<style lang="scss">
.prose {
  @apply leading-[1.75];
}

.prose :is(h1, h2, h3) {
  @apply font-bold;
  @apply mt-8 mb-4;
}

.prose h1 {
  @apply text-4xl;
}

.prose h2 {
  @apply text-3xl;
}

.prose h3 {
  @apply text-2xl;
}

.prose :is(p, pre) {
  @apply my-4;
}

.prose p {
  @apply my-6;
}

.prose :not(h1, h2, h3) > a {
  @apply underline decoration-1 decoration-dashed underline-offset-6;
  @apply hover:text-[#FFAC11];
}

.prose pre {
  @apply text-sm;
  @apply bg-[var(--bg-code-block)];
  @apply border border-solid border-gray/10;
  @apply p-4;
  @apply rounded-2 overflow-x-auto;
}

.prose :not(pre) > code {
  @apply dark:text-white text-black;
  @apply text-[15px];
  @apply bg-[var(--bg-code-block)];
  @apply py-1 px-1.5;
  @apply rounded;
}

.prose :is(ul, ol) {
  @apply ps-5;
}

.prose ul {
  @apply list-disc;
}

.prose ol {
  @apply list-decimal;
}

.prose li {
  @apply my-2;
  @apply marker:text-gray/60;
}
</style>
