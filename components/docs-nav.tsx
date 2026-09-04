"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DOCS, SECTIONS, type Heading, type SearchEntry } from "@/lib/docs";
import { ChevronDown, Search } from "@/components/icons";

/**
 * Docs navigation, and the reason this file exists.
 *
 * A doc page on a phone had no navigation at all. The rail of documents was
 * hidden below 1024px and the contents rail below 1280px, so a reader who
 * landed on needs.md at 375px got several thousand words with dozens of
 * headings, no table of contents, no list of the other pages and no way out but
 * the browser's back button. That is not a stylesheet slip, it is a component
 * that was never written, and this is it.
 *
 * One control, not three. The bar below is a single disclosure holding search,
 * every document, and this document's headings, because three separate
 * disclosures stacked under a sticky header is most of a small screen spent on
 * chrome.
 */

/** Substring match over the flattened index, ranked so a title beats a heading. */
function search(index: SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of index) {
    const field = (entry.heading ?? entry.doc).toLowerCase();
    const at = field.indexOf(q);
    if (at < 0) continue;
    // A hit at the start of the label is what the reader meant more often than
    // one in the middle of it, and a document beats a heading inside one.
    scored.push({ entry, score: (at === 0 ? 0 : 1) + (entry.heading ? 2 : 0) + at / 1000 });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, 12).map((s) => s.entry);
}

function Results({ results, onPick }: { results: SearchEntry[]; onPick?: () => void }) {
  return (
    <ul className="doc-results">
      {results.map((r) => (
        <li key={r.href}>
          <Link href={r.href} className="doc-result" onClick={onPick}>
            <span className="doc-result-label">{r.heading ?? r.doc}</span>
            {r.heading && <span className="doc-result-doc">{r.doc}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SearchField({
  index,
  onPick,
  autoFocus = false,
}: {
  index: SearchEntry[];
  onPick?: () => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => search(index, query), [index, query]);
  const empty = query.trim().length >= 2 && results.length === 0;

  return (
    <div>
      <div className="doc-search">
        <Search size={15} className="doc-search-icon" />
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the docs"
          aria-label="Search the documentation"
          className="doc-search-input"
        />
      </div>
      {results.length > 0 && <Results results={results} onPick={onPick} />}
      {empty && <p className="doc-search-empty">Nothing matches {`"${query.trim()}"`}.</p>}
    </div>
  );
}

function DocList({ current, onPick }: { current?: string; onPick?: () => void }) {
  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section}>
          <p className="t-eyebrow text-muted">{section}</p>
          <ul className="mt-2.5 border-l border-edge">
            {DOCS.filter((d) => d.section === section).map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/docs/${d.slug}/`}
                  onClick={onPick}
                  className={`doc-rail-link ${d.slug === current ? "is-current" : ""}`}
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** The search field on its own, for the docs index. */
export function DocsSearch({ index }: { index: SearchEntry[] }) {
  return <SearchField index={index} />;
}

/** The left rail on a wide screen: search, then every document. */
export function DocsRail({ current, index }: { current: string; index: SearchEntry[] }) {
  return (
    <nav className="hidden text-sm lg:block" aria-label="All documentation">
      <div className="sticky top-24 space-y-6">
        <SearchField index={index} />
        <DocList current={current} />
      </div>
    </nav>
  );
}

/**
 * The phone and tablet bar: one button, one sheet, everything in it.
 *
 * The sheet closes on Escape and on a route change, and while it is open the
 * body does not scroll behind it. The button reports its state with
 * aria-expanded so it is a disclosure to a screen reader rather than a mystery.
 */
export function DocsMobileNav({
  title,
  current,
  headings,
  index,
}: {
  title: string;
  current: string;
  headings: Heading[];
  index: SearchEntry[];
}) {
  const [open, setOpen] = useState(false);
  const still = useReducedMotion() ?? false;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prior;
    };
  }, [open]);

  return (
    <div className="doc-bar xl:hidden">
      <button
        type="button"
        className="doc-bar-button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="doc-bar-title">{title}</span>
        <span className={`doc-bar-chevron ${open ? "is-open" : ""}`} aria-hidden>
          <ChevronDown size={16} />
        </span>
        <span className="sr-only">{open ? "Close" : "Open"} the documentation menu</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="doc-scrim"
              onClick={() => setOpen(false)}
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={still ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18 }}
              aria-hidden
            />
            <motion.div
              ref={panel}
              className="doc-sheet"
              initial={still ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={still ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <SearchField index={index} onPick={() => setOpen(false)} autoFocus />

              {headings.length > 0 && (
                <div className="mt-6">
                  <p className="t-eyebrow text-muted">On this page</p>
                  <ul className="mt-2.5 border-l border-edge">
                    {headings.map((h, i) => (
                      <li key={`${h.id}-${i}`}>
                        <a
                          href={`#${h.id}`}
                          onClick={() => setOpen(false)}
                          className={`doc-rail-link ${h.level === 3 ? "is-nested" : ""}`}
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6">
                <DocList current={current} onPick={() => setOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
