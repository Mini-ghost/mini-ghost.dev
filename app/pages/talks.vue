<script setup lang="ts">
import format from '@/helper/format';

const { data: talks } = await useTalks();
const siteURL = useSiteURL();

useHead(() => {
  const data = talks.value as { title?: string; talks?: { year: string; content: any[] }[] } | undefined;
  const groups = data?.talks ?? [];
  const flat = groups.flatMap(group => group.content);

  return {
    title: data?.title,
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': `${siteURL.value}talks#collection`,
          name: `${data?.title ?? 'Talks'} | Alex Liu`,
          inLanguage: 'zh-TW',
          isPartOf: { '@id': `${siteURL.value}#website` },
          about: { '@id': `${siteURL.value}#alex` },
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: flat.map((talk: any, index: number) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: {
                '@type': 'Event',
                name: talk.title,
                startDate: talk.date,
                eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                eventStatus: 'https://schema.org/EventScheduled',
                location: {
                  '@type': 'Place',
                  name: talk.place,
                },
                performer: { '@id': `${siteURL.value}#alex` },
                url: talk.slide,
              },
            })),
          },
        }),
      },
    ],
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
        <span class="absolute -top-5 -left-5 text-[8rem] font-bold opacity-8">
          {{ group.year }}
        </span>
      </div>
      <ul class="space-y-6">
        <li
          v-for="talk in group.content"
          :key="talk.title"
        >
          <NuxtLink
            class="opacity-80 lg:opacity-60 transition-opacity duration-300 focus:opacity-100 hover:opacity-100 focus:outline-none"
            target="_blank"
            :to="talk.slide"
          >
            <span class="text-lg w-fit">
              {{ talk.title }}
            </span>
            <br>
            <span class="text-sm opacity-70">
              {{ format(talk.date) }} • {{ talk.place }}
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
