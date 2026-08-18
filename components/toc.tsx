"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/docs";

/**
 * The "on this page" rail, with the current heading marked.
 *
 * The observer's bottom margin keeps only the top band of the viewport in play,
 * so the active entry is the heading you are reading under rather than whatever
 * last scrolled into view at the foot of the screen.
 */
export function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;

    const seen = new Map<string, boolean>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = nodes.find((n) => seen.get(n.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-88px 0px -70% 0px" },
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [headings]);

  return (
    <nav className="hidden text-sm xl:block">
      <div className="sticky top-24">
        <p className="t-eyebrow text-muted">On this page</p>
        <ul className="mt-3 space-y-0.5 border-l border-edge">
          {headings.map((h, i) => (
            <li key={`${h.id}-${i}`}>
              <a
                href={`#${h.id}`}
                className={`-ml-px block border-l py-1 text-[13px] leading-snug transition-colors ${
                  h.level === 3 ? "pl-6" : "pl-3"
                } ${
                  active === h.id
                    ? "border-brand-fill text-text"
                    : "border-transparent text-muted hover:border-edge hover:text-text"
                }`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
