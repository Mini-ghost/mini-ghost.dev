export function useSiteURL(
  getter: (url: string) => string
): ComputedRef<string>;

export function useSiteURL(): string;

export function useSiteURL(getter?: (url: string) => string) {
  const {
    public: { siteURL },
  } = useRuntimeConfig();

  return getter ? computed(() => getter(siteURL)) : siteURL;
}
