import { Feed } from 'feed';
import { defineEventHandler, setHeader } from 'h3';

// @ts-expect-error virtual file
import { metadata } from '#metadata.json';

export default defineEventHandler(async event => {
  if (!process.env.prerender) return;

  const feed = new Feed({
    title: 'Alex Liu',
    description: 'The personal website of Alex Liu',
    feed: 'https://mini-ghost.dev/rss.xml',
    id: 'https://mini-ghost.dev/',
    link: 'https://mini-ghost.dev/posts/',
    language: 'zh-TW',
    image: 'https://avatars.githubusercontent.com/u/39984251',
    favicon: 'https://mini-ghost.dev/favicon.ico',
    copyright: `© 2019-${new Date().getFullYear()} Alex Liu. All rights reserved.`,
    feedLinks: {
      json: 'https://mini-ghost.dev/feed/json',
      atom: 'https://mini-ghost.dev/feed/atom',
    },
    author: {
      name: 'Alex Liu',
      email: 'dsa1314@gmail.com',
      link: 'https://mini-ghost.dev/',
    },
  });

  for (const slug in metadata) {
    const { title, description, tags, created, image } = metadata[slug];

    feed.addItem({
      title,
      link: `https://mini-ghost.dev/posts/${slug}`,
      description: description,
      category: tags.map((tag: string) => ({ name: tag })),
      author: [
        {
          name: 'Alex Liu',
          email: 'dsa1314@gmail.com',
          link: 'https://mini-ghost.dev',
        },
      ],
      date: new Date(created),
      image,
    });
  }

  setHeader(event, 'Content-Type', 'text/xml; charset=UTF-8');

  return feed.rss2();
});
