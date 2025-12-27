<script setup lang="ts">
const AVATAR_URL = 'https://avatars.githubusercontent.com/u/39984251';

const fetchFn = () => queryCollection('home')
  .select('meta')
  .first()
  .then(result => result!.meta)

const { data } = await useAsyncData('HOME', fetchFn);
const person = data.value!;

useHead(() => ({
  title: `Hello I'm ${person.name}`,
  description: person.description,
}));

if (import.meta.server) {
  useHead({
    link: [
      {
        rel: 'preconnect',
        href: 'https://avatars.githubusercontent.com',
        crossorigin: '',
      },
      {
        rel: 'preload',
        as: 'image',
        href: AVATAR_URL,
        fetchpriority: 'high',
      }
  ]
  })
}
</script>

<template>
  <div class="grid md:grid-cols-[clamp(280px,32vw,450px)_minmax(0,1fr)] gap-[calc(1.25rem+2vw)] w-11/12 max-w-[1366px] mx-auto lg:py-16 py-5">
    <div class="hidden md:block">
      <div class="sticky top-10 relative w-fit rounded-xl overflow-hidden opacity-80 transition-opacity duration-500 hover:opacity-100 after:content-empty after:block after:bg-gradient-to-br after:absolute after:top-0 after:w-full after:h-full after:block after:from-[#ABC74A] after:to-[#2F993A] after:opacity-30 after:transition-opacity after:duration-500 hover:after:opacity-20">
        <img
          :alt="person.name"
          decoding="async"
          height="450"
          :src="AVATAR_URL"
          width="450"
        >
      </div>
    </div>

    <div class="space-y-8">
      <h1 class="text-4xl lg:text-5xl leading-tight font-bold">
        Hello!<br> I'm {{ person.name }}
      </h1>
      <p class="leading-relaxed opacity-70">
        {{ person.description }}
      </p>

      <section class="space-y-5">
        <h2 class="text-2xl lg:text-3xl font-bold">
          Skills
        </h2>
        <ul class="flex flex-wrap gap-x-3 pl-4">
          <li
            v-for="item in person.skills"
            :key="item"
            class="inline-flex items-center"
          >
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>

      <section class="space-y-5">
        <h2 class="text-2xl lg:text-3xl font-bold">
          Publications
        </h2>
        <ul class="pl-4">
          <li 
            v-for="publication in person.publications" 
            :key="publication.title"
          >
            <a
              class="inline-flex items-center gap-3 p-2 rounded-md -ml-2 hover:text-orange"
              :href="publication.link"
              rel="noopener noreferrer"
              target="_blank"
            >
              <SvgoIcon aria-hidden="true" fill="currentColor" height="20" name="book-open" width="20" />
              <span>{{ publication.title }}</span>
            </a>
          </li>
        </ul>
      </section>

      <section class="space-y-5">
        <h2 class="text-2xl lg:text-3xl font-bold">
          Work Experience
        </h2>
        <ul class="pl-4">
          <li
            v-for="item in person.experiences"
            :key="item.company"
            class="relative flex ml-1 pt-0 pb-6 last:pb-2 before:content-[''] before:block before:absolute before:top-0 before:left-1 before:-translate-x-1/2 before:bottom-0 before:w-px before:bg-[#64696E]"
          >
            <span
              aria-hidden="true"
              class="transform size-2 rounded-full bg-[#64696E]"
            />
            <div class="flex flex-col gap-1 pl-4">
              <strong class="text-lg">{{ item.company }}</strong>
              <span class="text-sm opacity-60">
                {{ item.title }} <span class="italic">/ {{ item.period }}</span>
              </span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
