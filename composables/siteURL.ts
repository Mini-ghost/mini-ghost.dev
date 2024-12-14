import type { MaybeRefOrGetter } from 'vue';
import { joinURL, withTrailingSlash } from 'ufo';

export function useSiteURL(path: MaybeRefOrGetter<string> = '') {
  const {
    public: { siteURL },
  } = useRuntimeConfig();

  return computed(() => withTrailingSlash(joinURL(siteURL, toValue(path))));
}
