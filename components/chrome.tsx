"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { GitHub } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

const GH = "https://github.com/twill-lang/twill";

/** The reading-progress line under the nav. Absent, not frozen, when motion is off. */
function Progress() {
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 220, damping: 34, restDelta: 0.001 });
  if (still) return null;
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 h-px origin-left bg-brand-fill"
      style={{ scaleX: x }}
      aria-hidden
    />
  );
}

export function Nav() {
  const pathname = usePathname();
  const [lifted, setLifted] = useState(false);

  // The header sits on the page ground until the reader moves, then earns its
  // own edge. Passive listener: this runs on every scroll frame.
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const link = (active: boolean) =>
    `transition-colors ${active ? "text-text" : "text-muted hover:text-text"}`;

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        lifted
          ? "border-b border-edge bg-ground/75 shadow-[var(--shadow-1)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-15 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-mono text-[15px] font-semibold tracking-tight"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/twill-mark.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden
            className="transition-transform duration-300 group-hover:rotate-[-6deg]"
          />
          twill
        </Link>
        <div className="ml-auto flex items-center gap-5 text-sm">
          <Link href="/docs/" className={link(pathname.startsWith("/docs"))}>
            Docs
          </Link>
          <a href={`${GH}/tree/main/examples`} className={`hidden sm:inline ${link(false)}`}>
            Examples
          </a>
          <a href={`${GH}/releases`} className={link(false)}>
            Releases
          </a>
          <a href={GH} aria-label="twill on GitHub" className={link(false)}>
            <GitHub size={17} />
          </a>
          <ThemeToggle className="-my-1" />
        </div>
      </nav>
      <Progress />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-28 border-t border-edge">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-12 text-sm text-muted sm:flex-row sm:items-center sm:px-8">
        <p>
          twill is MIT licensed, and an early prototype. Built by{" "}
          <a href="https://github.com/martin-k-m" className="text-link hover:underline">
            Martin Muskov
          </a>
          .
        </p>
        <p className="sm:ml-auto">
          <a
            href="https://github.com/twill-lang"
            className="inline-flex items-center gap-1.5 text-link hover:underline"
          >
            <GitHub size={15} />
            github.com/twill-lang
          </a>
        </p>
      </div>
    </footer>
  );
}
