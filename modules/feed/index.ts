import { addServerHandler, createResolver, defineNuxtModule } from '@nuxt/kit';
import { globby } from 'globby';
import grayMatter from 'gray-matter';
import { readFile } from 'node:fs/promises';
import { filename } from 'pathe/utils';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

export default defineNuxtModule({
  meta: {
    name: 'feed',
  },
  async setup(_, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    const files = await globby(resolve('../../content/posts'));

    const metadata: Record<string, any> = {};
    const md = remark().use(remarkHtml);

    for (const path of files) {
      const contents = await readFile(path, 'utf-8');
      const slug = filename(path);

      const {
        data: { title, created, tags, description },
      } = grayMatter(contents);

      const titleEncoded = encodeURIComponent(title);
      const create = `${+new Date(created)}`;
      const query = new URLSearchParams({
        // read: content.readingTime.text,
        create,
      });

      const html = await md
        .process(contents.replace(/---[\s\S]*---/m, ''))
        .then(r => r.value);

      metadata[slug] = {
        title,
        description,
        created,
        tags,
        image: `https://og-image-mini-ghost.vercel.app/${titleEncoded}?${query}`,
        html,
      };
    }

    addServerHandler({
      route: '/rss.xml',
      middleware: false,
      handler: resolve('./runtime/routes/feed'),
    });

    nuxt.options.nitro.virtual = nuxt.options.nitro.virtual || {};
    nuxt.options.nitro.virtual['#metadata.json'] = () =>
      `export const metadata = ${JSON.stringify(metadata)}`;
    nuxt.options.nitro.externals = nuxt.options.nitro.externals || {};
    nuxt.options.nitro.externals.inline =
      nuxt.options.nitro.externals.inline || [];
    nuxt.options.nitro.externals.inline.push('#metadata.json');
  },
});
