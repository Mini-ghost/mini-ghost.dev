import { toRef } from '@vueuse/core';
import { joinURL, withTrailingSlash } from 'ufo';

import type { MaybeRefOrGetter } from '@vueuse/core';

export async function useProse(_path: MaybeRefOrGetter<string>) {
  const path = toRef(_path);
  const fullPath = useSiteURL(url => {
    return withTrailingSlash(joinURL(url, path.value));
  });

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
