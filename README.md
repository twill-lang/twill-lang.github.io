# twill-lang.github.io

The website for [twill](https://github.com/twill-lang/twill), at
<https://twill-lang.github.io>.

Next.js, exported to static HTML and served by GitHub Pages. No runtime server,
so no route handlers, no ISR and no image optimizer.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export into out/
```

## The docs are not kept here

Every page under `/docs` is fetched from `twill-lang/twill` at build time and
rendered into static HTML. `lib/docs.ts` holds the curated list of which files
are published and under what slug; the twill repo's docs folder also carries
working notes that are useful next to the code and confusing on a website.

A copy in this repository would be a second source of truth for the same
sentence, and it is the copy on the website that goes stale, because nobody
editing the language remembers to update a different repository's mirror.

Two consequences:

- **A build needs the network.** A failed fetch throws rather than rendering a
  placeholder, because a page that half-rendered would publish a doc missing its
  middle and look fine doing it.
- **A docs edit does not reach the site on its own.** The deploy workflow listens
  for a `docs-changed` repository dispatch and also rebuilds daily as a floor.

## Brand

The palette and the asset rules are
[docs/brand.md](https://github.com/twill-lang/twill/blob/main/docs/brand.md) in
the twill repo. The marks in `public/` are copies of that repo's `assets/`;
re-copy them rather than editing them here.
