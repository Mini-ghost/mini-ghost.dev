import LinkIcon from '@/assets/icons/link.svg?component';
import FacebookIcon from '@/assets/icons/facebook.svg?component';
import LinkedinIcon from '@/assets/icons/linkedin.svg?component';
import TwitterIcon from '@/assets/icons/twitter.svg?component';

export function useProseShare(options: {
  title: MaybeRefOrGetter<string>;
  path: MaybeRefOrGetter<string>;
}) {
  const { copy } = useClipboard({ source: options.path });

  return computed(() => {
    const path = toValue(options.path);
    const title = toValue(options.title);

    const content = encodeURIComponent(`${title}\n${path}\n`);

    return [
      {
        label: 'Share Link',
        icon: LinkIcon,
        attrs: {
          type: 'button',
          onClick() {
            copy();
          },
        },
      },
      {
        label: 'Share on Twitter',
        icon: TwitterIcon,
        attrs: {
          to: `https://twitter.com/intent/tweet?text=${content}`,
          target: '_blank',
        },
      },
      {
        label: 'Share on Facebook',
        icon: FacebookIcon,
        attrs: {
          to: `https://www.facebook.com/sharer/sharer.php?&t=${content}`,
          target: '_blank',
        },
      },
      {
        label: 'Share on LinkedIn',
        icon: LinkedinIcon,
        attrs: {
          to: `https://www.linkedin.com/shareArticle?mini=true&url=${path}&title=${encodeURIComponent(
            title
          )}`,
          target: '_blank',
        },
      },
    ];
  });
}
