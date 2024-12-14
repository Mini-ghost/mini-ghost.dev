import type { MaybeRefOrGetter } from 'vue';

export async function useProse(_path: MaybeRefOrGetter<string>) {
  const path = toRef(_path);
  const fullPath = useSiteURL(path);

  const queryPost = useAsyncData<any>(`POST_CONTENT:${path.value}`, () => {
    return queryContent(path.value).where({ _partial: false }).findOne();
  });

  const querySurround = useAsyncData(`POST_SURROUND:${path.value}`, () => {
    return queryContent('/posts/')
      .where({ _partial: false })
      .only(['_path', 'title'])
      .sort({ created: 1 })
      .findSurround(path.value);
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
