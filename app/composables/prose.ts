import type { MaybeRefOrGetter } from 'vue';

export async function useProse(_path: MaybeRefOrGetter<string>) {
  const path = toRef(_path);
  const fullPath = useSiteURL(path);

  const queryPost = useAsyncData<any>(`POST_CONTENT:${path.value}`, () => {
    return queryCollection('posts')
      .path(path.value)
      .first();
  });

  const querySurround = useAsyncData(`POST_SURROUND:${path.value}`, () => {
    return queryCollectionItemSurroundings(
      'posts', 
      '/posts/',
      {
        fields: ['path', 'title'],
      }
    )
  });

  await Promise.all([queryPost, querySurround]);

  const { data: post } = queryPost;
  const { data: surround } = querySurround;

  return {
    fullPath,
    surround,
    post,
  };
}
