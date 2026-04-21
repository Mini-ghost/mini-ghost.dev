import { createResolver, defineNuxtModule } from '@nuxt/kit';
import { globby } from 'globby';
import grayMatter from 'gray-matter';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { filename } from 'pathe/utils';

const SITE_URL = 'https://mini-ghost.dev';

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

function extractSkillDescription(md: string): string {
  const body = md.replace(/^---[\s\S]*?\n---\n/, '');
  const paragraph = body
    .split(/\n\s*\n/)
    .find(p => p.trim() && !p.trim().startsWith('#'));
  return (paragraph ?? '').trim().replace(/\s+/g, ' ').slice(0, 280);
}

export default defineNuxtModule({
  meta: {
    name: 'agent-ready',
  },
  setup(_, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    const postsSrcDir = resolve('../../content/posts');
    const skillsSrcDir = resolve('../../public/.well-known/agent-skills');

    nuxt.hook('nitro:init', nitro => {
      nitro.hooks.hook('prerender:done', async () => {
        const publishDir = nitro.options.output.publicDir;

        // A. Emit <publishDir>/posts/<slug>.md for each content post.
        const postFiles = await globby(join(postsSrcDir, '*.md'));
        await mkdir(join(publishDir, 'posts'), { recursive: true });

        const resources: { type: string; url: string; digest: string }[] = [];

        for (const path of postFiles) {
          const slug = filename(path);
          if (!slug) continue;

          const raw = await readFile(path, 'utf-8');
          const { content, data } = grayMatter(raw);

          const body = `# ${data.title}\n\n${content.trimStart()}`;
          const outPath = join(publishDir, 'posts', `${slug}.md`);
          await writeFile(outPath, body, 'utf-8');

          resources.push({
            type: 'article',
            url: `${SITE_URL}/posts/${slug}.md`,
            digest: `sha256:${sha256(body)}`,
          });
        }

        // B. Read SKILL.md files from public/ and compute digests from the
        //    source bytes (public/ is copied verbatim into publishDir).
        const skillFiles = await globby(join(skillsSrcDir, '*/SKILL.md'));
        const skills = [];

        for (const file of skillFiles) {
          const buf = await readFile(file);
          const name = dirname(file).split('/').pop();
          if (!name) continue;

          skills.push({
            name,
            type: 'skill-md',
            description: extractSkillDescription(buf.toString('utf-8')),
            url: `${SITE_URL}/.well-known/agent-skills/${name}/SKILL.md`,
            digest: `sha256:${sha256(buf)}`,
          });
        }

        // C. Write /.well-known/agent-skills/index.json.
        const indexPath = join(
          publishDir,
          '.well-known/agent-skills/index.json',
        );
        await mkdir(dirname(indexPath), { recursive: true });

        const index = {
          $schema:
            'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
          name: 'mini-ghost.dev',
          description:
            "Alex Liu's personal website and blog. Articles are available as Markdown via content negotiation or direct .md URLs.",
          skills,
          resources,
        };

        await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
      });
    });
  },
});
