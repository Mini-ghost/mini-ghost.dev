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
    queryContent(route.path)
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
    <template v-else>
      Not Fount
    </template>
  </div>
</template>

<style lang="scss">
.prose {
  --at-apply: leading-[1.75];
}

.prose :is(h1, h2, h3) {
  --at-apply: font-bold;
  --at-apply: mt-8 mb-4;
}

.prose h1 {
  --at-apply: text-4xl;
}

.prose h2 {
  --at-apply: text-3xl;
}

.prose h3 {
  --at-apply: text-2xl;
}

.prose :is(p, pre) {
  --at-apply: my-4;
}

.prose p {
  --at-apply: my-6;
}

.prose :not(h1, h2, h3) > a {
  --at-apply: underline decoration-1 decoration-dashed underline-offset-6;
  --at-apply: hover:text-[#FFAC11];
}

.prose pre {
  --at-apply: text-sm;
  --at-apply: bg-[var(--bg-code-block)];
  --at-apply: border border-solid border-gray/10;
  --at-apply: p-4;
  --at-apply: rounded-2 overflow-x-auto;
}

.prose :not(pre) > code {
  --at-apply: dark:text-white text-black;
  --at-apply: text-[15px];
  --at-apply: bg-[var(--bg-code-block)];
  --at-apply: py-1 px-1.5;
  --at-apply: rounded;
}

.prose :is(ul, ol) {
  --at-apply: ps-5;
}

.prose ul {
  --at-apply: list-disc;
}

.prose ol {
  --at-apply: list-decimal;
}

.prose li {
  --at-apply: my-2;
  --at-apply: marker:text-gray/60;
}
</style>
