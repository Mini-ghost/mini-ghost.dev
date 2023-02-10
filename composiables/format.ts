import type { Ref } from 'vue';

type UseFormatDate<T> = T | Ref<T> | (() => T);

const $format = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}).format;

export const format = (date: string | number | Date) => {
  if (typeof date === 'string') date = new Date(date);
  return $format(date);
};

export default function useFormat(
  date: UseFormatDate<Date | number | string | undefined | null>
) {
  return computed(() => {
    if (typeof date === 'function') date = date();
    if (!(date = unref(date))) return;

    return format(date);
  });
}
