import { hash } from 'ohash';

interface Post {
  _path: string;
  title: string;
  description: string;
  created: string;
  readingTime: {
    text: string;
  };
}

export async function useTags(target: string) {
  const nuxtApp = useNuxtApp();

  const key = `QUERY_TAGS:${hash(decodeURIComponent(target))}`;

  const { data } = await useAsyncData(key, async () => {
    const list = await queryContent('/posts/')
      .where({ _partial: false })
      .only(['tags'])
      .find();

    const tags = [...new Set(list.map(post => post.tags as string).flat())];
    const title =
      tags.find(tag => tag.replace(/\s/, '-').toLowerCase() === target) ?? '';

    if (!title) return null;

    const posts = await nuxtApp.runWithContext(async () => {
      const posts = await queryContent('/posts/')
        .where({ _partial: false })
        .where({ tags: { $contains: title } })
        .only(['_path', 'title', 'description', 'created', 'readingTime'])
        .sort({ created: -1 })
        .find();

      return posts as Post[];
    });

    return {
      title,
      posts,
    };
  });

  return {
    data,
  };
}
