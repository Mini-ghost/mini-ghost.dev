interface Post {
  _path: string;
  title: string;
  created: string;
  readingTime: {
    text: string;
  };
}

export async function usePosts() {
  const { data: posts } = await useAsyncData(
    'QUERY_POSTS',
    () =>
      queryContent('/posts/')
        .where({ _partial: false })
        .only(['_path', 'title', 'created', 'readingTime'])
        .sort({ created: -1 })
        .find() as Promise<Post[]>,
    {
      transform(result) {
        const posts: { year: string; posts: Post[] }[] = [];

        let group: Post[] = [];
        let year: string | null = null;

        result.forEach(item => {
          let current: string;
          if (
            (current = item.created.slice(0, 4)) !== year &&
            typeof year === 'string'
          ) {
            posts.push({
              year,
              posts: group,
            });

            group = [];
          }

          year = current;
          group.push(item);
        });

        if (typeof year === 'string' && group.length) {
          posts.push({
            year,
            posts: group,
          });
        }

        return posts;
      },
    }
  );

  return {
    posts,
  };
}
