"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Tags every animated wrapper so the <noscript> rule in globals.css can undo
 *  the entrance state. Without JS these elements keep their inline opacity:0. */
const cx = (className?: string) => (className ? `reveal ${className}` : "reveal");

/**
 * Scroll reveal.
 *
 * `whileInView` with `once` rather than a scroll-linked value: the content is
 * prose and code, and tying its opacity to scroll position means a reader who
 * scrolls back up watches the paragraph they are reading fade out.
 *
 * Every animation here is gated on the reduced-motion preference, which returns
 * the element to its final state rather than to a hidden one. Animation that
 * hides content when disabled is a content bug, not a motion preference.
 */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const still = useReducedMotion();
  if (still) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cx(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-72px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** The hero's staggered entrance. Runs on load, not on scroll. */
export function Enter({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const still = useReducedMotion();
  if (still) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cx(className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A grid or list whose children arrive one after another.
 *
 * The parent owns the timing so a cell's delay comes from its position rather
 * than from a hand-written number per cell, which is what stops a ten-item grid
 * from finishing its entrance a second after the reader got there.
 */
export function Stagger({
  children,
  className,
  step = 0.045,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  delay?: number;
}) {
  const still = useReducedMotion();
  if (still) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cx(className)}
      initial="out"
      whileInView="in"
      viewport={{ once: true, margin: "-72px" }}
      variants={{ in: { transition: { staggerChildren: step, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

/** One cell of a `Stagger`. Inert on its own, so it needs the parent. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const still = useReducedMotion();
  if (still) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cx(className)}
      variants={{
        out: { opacity: 0, y: 12 },
        in: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}
