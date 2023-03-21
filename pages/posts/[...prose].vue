<script setup lang="ts">
import format from '@/helper/format';
</script>

<template>
  <ContentDoc>
    <template #default="{ doc, excerpt }">
      <ContentMeta
        :title="doc.title"
        :description="doc.description"
        :image="doc.image"
      />
      <article class="prose max-w-21cm w-11/12 mx-auto pb-16 lg:pb-32">
        <header>
          <h1 class="mt-0 text-[1.75rem] lg:text-[2.25rem] leading-relaxed">
            <NuxtLink :to="doc._path">
              {{ doc.title }}
            </NuxtLink>
          </h1>
          <div>
            <time
              class="text-sm text-gray/60"
              :datetime="doc.created"
            >
              {{ format(doc.created) }}
            </time>
          </div>
          <p>{{ doc.description }}</p>
        </header>

        <ContentRenderer
          :value="doc"
          :excerpt="excerpt"
        />
      </article>
    </template>
  </ContentDoc>
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
    @apply border border-[#10B981]/30 bg-[#10B981]/20 p-4 rounded hover:border-[#10B981]/50;
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
