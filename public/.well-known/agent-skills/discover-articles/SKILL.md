# Discover all articles

Enumerate every article published on mini-ghost.dev.

## Methods

### RSS feed (recent articles, with metadata)

    GET https://mini-ghost.dev/rss.xml

Response: `application/rss+xml`. Each `<item>` includes the article title, description, tags (as `<category>`), publication date, image, and canonical link.

### Sitemap (complete URL inventory)

    GET https://mini-ghost.dev/sitemap.xml

Response: `application/xml`. Lists every indexable URL on the site, including article permalinks under `/posts/`.

## Follow-up

For each article URL, use the `read-article-as-markdown` skill to fetch the full Markdown body.
