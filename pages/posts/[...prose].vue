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
      <article class="prose max-w-21cm w-11/12 mx-auto pb-32">
        <header>
          <h1 class="mt-0 text-4xl leading-relaxed">
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
  --at-apply: leading-loose;
}

.prose :is(h1, h2, h3) {
  --at-apply: font-bold;
  --at-apply: mt-8 mb-4;
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
  --at-apply: text-[0.785rem];
  --at-apply: text-[var(--c-text-code)];
  --at-apply: bg-[var(--bg-code-inline)];
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
