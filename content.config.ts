import { defineCollection, defineContentConfig, z } from '@nuxt/content';

export default defineContentConfig({
  collections: {
    home: defineCollection({
      type: 'data',
      source: 'index.md',
      schema: z.object({
        // 
      })
    }),

    posts: defineCollection({
      type: 'page',
      source: 'posts/*.md',
      schema: z.object({
        tags: z.array(z.string()),
        created: z.string().datetime(),
        image: z.string().optional(),
        image_caption: z.string().optional(),
        readingTime: z.object({
          text: z.string(),
          minutes: z.number(),
          time: z.number(),
          words: z.number()
        })
      })
    }),

    talks: defineCollection({
      type: 'page',
      source: 'talks.md',
      schema: z.object({
        talks: z.array(z.object({
          title: z.string(),
          place: z.string(),
          date: z.string().datetime(),
          slides: z.string().optional(),

        }))
      })
    })
  }
})