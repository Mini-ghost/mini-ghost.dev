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
  const { data } = await useAsyncData(`QUERY_TAGS`, async () => {
    const list = await queryContent('/posts/')
      .where({ _partial: false })
      .only(['tags'])
      .find();

    const tags = [...new Set(list.map(post => post.tags as string).flat())];
    const title =
      tags.find(tag => tag.replace(/\s/, '-').toLowerCase() === target) ?? '';

    const posts = await nuxtApp.runWithContext(async () => {
      const posts = await queryContent('/posts/')
        .where({ _partial: false })
        .where({ tags: { $contains: title! } })
        .only(['_path', 'title', 'description', 'created', 'readingTime'])
        .sort({ created: -1 })
        .find();

      return posts;
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
