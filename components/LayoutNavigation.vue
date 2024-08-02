<script setup lang="ts">
import GithubIcon from '@/assets/icons/github.svg?component';
import RssIcon from '@/assets/icons/rss.svg?component';
import TwitterIcon from '@/assets/icons/twitter.svg?component';

const enum DIRECTION {
  UP,
  DOWN,
}

const offset = ref(0);
const direction = ref<DIRECTION>();

const onScroll = () => (offset.value = window.scrollY);

useEventListener('scroll', onScroll, {
  capture: false,
  passive: true,
});

watch(offset, (value, oldValue) => {
  direction.value = value > oldValue ? DIRECTION.DOWN : DIRECTION.UP;
});
</script>

<template>
  <header
    class="sticky top-0 transition-transform duration-700 backdrop-blur-sm"
    :class="{
      '-translate-y-full': direction === DIRECTION.DOWN
    }"
  >
    <div class="flex items-center w-11/12 mx-auto py-4 lg:w-full lg:px-8 lg:py-6">
      <NuxtLink
        class="text-xl lg:text-2xl font-bold"
        to="/"
      >
        Alex Liu
      </NuxtLink>
      <div class="grow" />
      <nav class="flex items-center gap-x-3">
        <NuxtLink
          active-class="!op-100"
          class="transition-opacity duration-300 op-50 hover:op-100"
          to="/posts"
        >
          Blog
        </NuxtLink>
        <NuxtLink
          active-class="!op-100"
          class="transition-opacity duration-300 op-50 hover:op-100"
          to="/talks"
        >
          Talks
        </NuxtLink>
        <div class="flex gap-x-3 before:content-empty before:bg-white/20 before:h-6 before:w-px before:ms-2">
          <NuxtLink
            aria-label="Follow on Twitter"
            class="transition-opacity duration-300 op-50 hover:op-100"
            target="_blank"
            to="https://twitter.com/Minighost_Alex"
          >
            <TwitterIcon 
              height="24"
              width="24"
            />
          </NuxtLink>
          <NuxtLink
            aria-label="Follow on GitHub"
            class="transition-opacity duration-300 op-50 hover:op-100"
            target="_blank"
            to="https://github.com/Mini-ghost"
          >
            <GithubIcon 
              height="24"
              width="24"
            />
          </NuxtLink>
          <NuxtLink
            aria-label="Visit Blog RSS Feed"
            class="transition-opacity duration-300 op-50 hover:op-100"
            target="_blank"
            to="/rss.xml"
          >
            <RssIcon
              height="24"
              width="24"
            />
          </NuxtLink>
        </div>
      </nav>
    </div>
  </header>
</template>
