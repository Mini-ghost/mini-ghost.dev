<script setup lang="ts">
interface Person {
  description: string;
  name: string;
  experiences: Experience[];
  skills: string[];
}

interface Experience {
  title: string;
  company: string;
  period: string;
}

const fetchFn = () =>
  queryContent('/').without(['_']).findOne() as any as Promise<Person>;

const { data } = await useAsyncData('HOME', fetchFn);
const person = data.value!;
</script>

<template>
  <div class="grid lg:grid-cols-[450px_minmax(0,1fr)] md:grid-cols-[320px_minmax(0,1fr)] gap-[calc(1.25rem+2vw)] w-11/12 max-w-[1366px] mx-auto md:py-10 py-5">
    <div class="hidden md:block">
      <div class="relative w-fit rounded-xl overflow-hidden opacity-80 transition-opacity duration-500 hover:opacity-100 after:content-[''] after:block after:bg-gradient-to-br after:absolute after:top-0 after:w-full after:h-full after:block after:from-[#ABC74A] after:to-[#2F993A] after:opacity-30 after:transition-opacity after:duration-500 hover:after:opacity-20">
        <img
          src="https://avatars.githubusercontent.com/u/39984251"
          width="450"
          height="450"
          :alt="person.name"
          decoding="async"
        >
      </div>
    </div>

    <div class="space-y-8">
      <h1 class="text-5xl leading-tight font-bold">
        Hello!<br> I'm {{ person.name }}
      </h1>
      <p>
        {{ person.description }}
      </p>

      <section class="space-y-5">
        <h2 class="text-3xl font-bold">
          Skills
        </h2>
        <ul class="flex space-x-3">
          <li
            v-for="item in person.skills"
            :key="item"
            class="flex items-center before:content-[''] before:block first:before:hidden before:h-1/3 before:w-px before:bg-[#8A949E] before:mr-3"
          >
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>

      <section class="space-y-5">
        <h2 class="text-3xl font-bold">
          Work Experience
        </h2>
        <ul>
          <li
            v-for="item in person.experiences"
            :key="item.company"
            class="relative flex ml-1 pt-0 pb-6 last:pb-2 before:content-[''] before:block before:absolute before:top-0 before:left-1 before:bottom-0 before:w-px before:bg-[#8A949E]"
          >
            <span
              aria-hidden="true"
              class="w-2 h-2 rounded-full bg-[#8A949E]"
            />
            <div class="pl-4 group">
              <p class="text-lg">
                {{ item.company }}
              </p>
              <div class="text-sm opacity-60 mt-1">
                {{ item.title }} <i>/ {{ item.period }}</i>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
