import { hash } from 'ohash';

export function useTags(target: string) {
  return useAsyncData(`QUERY_TAGS:${hash(decodeURIComponent(target))}`, async () => {
    
    const list = await queryCollection('posts')
      .select('path', 'title', 'description', 'tags', 'created', 'readingTime')
      .order('created', 'DESC')
      .all()

    const posts = []
    const tags = [...new Set(list.map(post => post.tags).flat())]
    const name =
      tags.find(tag => toLowerCase(tag).replace(/\s/, '-') === target) ?? '';

    if (!name) return null;

    for (const post of list) {
      if (post.tags.some(tag => tag === name)) {
        posts.push(post);
      }
    }

    return {
      name,
      posts,
    };
  });
}
