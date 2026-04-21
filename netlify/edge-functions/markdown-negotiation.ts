// Netlify Edge Function — content-negotiated Markdown for /posts/*.
// Runs on Deno. When the client's Accept header expresses a preference for
// text/markdown, transparently serves the pre-built `.md` sibling; otherwise
// returns undefined so the CDN serves the original HTML unchanged.
//
// The Accept matcher deliberately rejects `*/*` so browsers — which send
// `Accept: text/html,application/xhtml+xml,...,*/*;q=0.8` — always get HTML.

const MARKDOWN_ACCEPT =
  /(?:^|,)\s*text\/markdown\b(?![^,]*;\s*q=0(?:\.0+)?\b)/i;

export default async (request: Request): Promise<Response | undefined> => {
  const url = new URL(request.url);

  // Match /posts/<slug> or /posts/<slug>/ only — no dots in slug so we
  // never shadow /posts/<slug>.md itself or any static asset.
  const match = url.pathname.match(/^\/posts\/([^/.]+)\/?$/);
  if (!match) return;

  if (!MARKDOWN_ACCEPT.test(request.headers.get('accept') ?? '')) return;

  const slug = match[1];
  const mdUrl = new URL(`/posts/${slug}.md`, url);

  const upstream = await fetch(mdUrl, {
    headers: { accept: 'text/plain, */*' },
  });
  if (!upstream.ok) return;

  return new Response(await upstream.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      Link:
        `<${url.origin}/posts/${slug}>; rel="canonical", ` +
        `<${url.origin}/posts/${slug}.md>; rel="alternate"; type="text/markdown"`,
    },
  });
};

export const config = {
  path: '/posts/*',
  excludedPath: ['/posts/*.md', '/posts/*/_payload.json'],
};
