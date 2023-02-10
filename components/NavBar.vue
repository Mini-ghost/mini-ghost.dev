<template>
  <header class="relative flex p-8">
    <NuxtLink
      to="/"
      class="absolute top-0 left-0 m-8"
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
  </header>
</template>
