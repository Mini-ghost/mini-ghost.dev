<script setup lang="ts">
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
        to="/"
        class="text-lg font-bold"
      >
        Alex Liu
      </NuxtLink>
      <div class="grow" />
      <nav>
        <NuxtLink
          to="/posts"
          class="transition-opacity duration-300 op-60 hover:op-100"
        >
          Blog
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
