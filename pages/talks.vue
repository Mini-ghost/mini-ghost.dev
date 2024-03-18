<script setup lang="ts">
import format from '@/helper/format';

const { data: talks } = await useTalks();

useHead(() => {
  return {
    title: talks.value!.title,
  };
});
</script>

<template>
  <div class="max-w-21cm w-11/12 mx-auto space-y-4 lg:space-y-6 lg:pt-16 pb-16 lg:pb-32">
    <h1 class="text-3xl lg:text-5xl font-bold">
      {{ talks!.title }}
    </h1>

    <div
      v-for="group in talks?.talks"
      :key="group.year"
    >
      <div class="relative h-20 pointer-events-none select-none">
        <span class="absolute -top-5 -left-5 text-[8rem] font-bold opacity-5">
          {{ group.year }}
        </span>
      </div>
      <ul class="space-y-6">
        <li
          v-for="talk in group.content"
          :key="talk.title"
        >
          <NuxtLink
            :to="talk.slide"
            class="opacity-80 lg:opacity-60 transition-opacity duration-300 focus:opacity-100 hover:opacity-100 focus:outline-none"
            target="_blank"
          >
            <span class="text-lg w-fit">
              {{ talk.title }}
            </span>
            <br>
            <span class="text-sm opacity-70">
              {{ format(talk.date, { month: 'short', day: 'numeric' }) }} • {{ talk.place }}
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
