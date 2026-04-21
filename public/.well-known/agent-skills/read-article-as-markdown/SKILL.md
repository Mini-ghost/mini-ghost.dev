# Read an article as Markdown

Fetch any article on mini-ghost.dev as clean Markdown instead of rendered HTML. Useful for summarisation, citation, indexing, or grounding by AI agents.

## Inputs

- `slug` — the article slug (the last URL segment, e.g. `nuxt-link-how-to-prefetch`)

## Methods

### Method 1 — direct `.md` URL (preferred)

    GET https://mini-ghost.dev/posts/<slug>.md

Response: `200 OK` with `Content-Type: text/markdown; charset=utf-8`.

### Method 2 — content negotiation on the canonical URL

    GET https://mini-ghost.dev/posts/<slug>
    Accept: text/markdown

Response: `200 OK` with `Content-Type: text/markdown; charset=utf-8`, `Vary: Accept`, and a `Link: <...>; rel="canonical"` header pointing back at the HTML URL.

Both methods return the same body: the article's Markdown source with YAML frontmatter stripped and a `# <title>` heading prepended.

## Discovery

Article URLs can be enumerated with the `discover-articles` skill.
