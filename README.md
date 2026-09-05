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

## Nothing about a release is typed into this repository

Every page under `/docs` is fetched from `twill-lang/twill` at build time and
rendered into static HTML. `lib/docs.ts` holds the curated list of which files
are published and under what slug; the twill repo's docs folder also carries
working notes that are useful next to the code and confusing on a website.

`lib/releases.ts` does the same for `CHANGELOG.md`. The version chip, the date
beside it and the list of what each release closed are parsed out of that file
when the site is built, so releasing the language updates the site and there is
no constant here to remember on release day. That is not a refactor for its own
sake: the version chip, the "new in X" heading and the feature list used to be
three hand-copied strings, and a site for a language on 1.9.0 spent a month
saying 1.7 in one place and 1.9 in another because of it.

A copy in this repository would be a second source of truth for the same
sentence, and it is the copy on the website that goes stale, because nobody
editing the language remembers to update a different repository's mirror.

Two consequences:

- **A build needs the network.** A failed fetch throws rather than rendering a
  placeholder, because a page that half-rendered would publish a doc missing its
  middle and look fine doing it.
- **A docs edit does not reach the site on its own.** The deploy workflow listens
  for a `docs-changed` repository dispatch and also rebuilds daily as a floor.

## The code samples are run before they are pasted

Every listing on the home page and every terminal block beside it is the output
of a real `twill` invocation, not a reconstruction. The shape figure in section
01 generates its message from the same one rule the checker applies, and all
sixteen states it can be in were diffed against `twill check` on the 1.9.0
binary. A sample that does not compile is the worst bug a language's website can
have, so if you change one, run it.

## Checks

`.github/workflows/ci.yml` runs `npm run typecheck`, `npm run build` and
`npm run audit:hidden` on every pull request. Because the build fetches the docs
and the changelog, it is also the check that every published doc still exists
upstream and that `CHANGELOG.md` is still shaped the way `lib/releases.ts`
parses.

`npm run audit:hidden` is the one that guards the site's motion.
`scripts/hidden-audit.mjs` opens every built page in Chrome under the condition
this site has twice got wrong -- the document hidden, `requestAnimationFrame`
and `IntersectionObserver` never delivered, the animation timeline pinned at
zero -- walks every element on the page and fails if any of them computes to
opacity 0. It needs a Chrome or Chromium, which it finds on the runner, at
`CHROME`, or in a local Playwright download; it has no npm dependency of its own.

The rule it enforces is worth stating in words too, because it is what makes the
check pass rather than the check being what makes it true: **the resting state
of every element on this site is visible, and a hidden state is only ever
applied from inside an animation frame.** A page that never gets a frame never
reaches one.

`.github/workflows/deploy.yml` builds and publishes on a push to main, on a
`docs-changed` dispatch from the twill repo, and daily.

## Brand

The palette and the asset rules are
[docs/brand.md](https://github.com/twill-lang/twill/blob/main/docs/brand.md) in
the twill repo. The marks in `public/` are copies of that repo's `assets/`;
re-copy them rather than editing them here.
