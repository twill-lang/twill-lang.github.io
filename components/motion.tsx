"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Entrances, and the one rule that makes them safe.
 *
 * THE HIDDEN STATE IS ONLY EVER APPLIED FROM INSIDE AN ANIMATION FRAME.
 *
 * The previous version of this file used motion/react, which writes its
 * `initial` state into the markup: the prerendered HTML carried
 * `style="opacity:0"` on 49 of the home page's 54 wrappers, and the tween that
 * was supposed to clear it needs animation frames to run. In any context that
 * does not deliver frames -- a background tab, a thumbnail or print capture, a
 * page opened while the compositor is busy elsewhere -- the h1, the lede, all
 * ten section headings and 52 of 53 paragraphs stayed at opacity 0 with nothing
 * scheduled to bring them back. Measured on the built export with
 * requestAnimationFrame stubbed out: 49 wrappers at opacity 0, forever.
 *
 * So nothing here is hidden by default. The resting state of every element on
 * this page is visible, in the HTML, before any script runs, and an entrance is
 * a CSS animation added by a class. The class is added in one place only: an
 * `IntersectionObserver` callback, which the browser delivers at the end of a
 * frame and therefore does not deliver at all when there are no frames.
 *
 * That gate is the rendering loop itself. A page that cannot animate cannot
 * reach the hidden state, which is the property the old arrangement lacked and
 * the reason a report could claim the entrances were fine while the whole page
 * below the release strip was blank.
 *
 * AND NOTHING THAT HAS ALREADY BEEN PAINTED IS EVER ENTERED.
 *
 * That is the second rule, and the first revision of this file did not have it.
 * Being safe against a browser that never paints is not the same as being right
 * on one that does. The entrance is a class added at hydration, hydration
 * happens after first paint, and the animation starts at opacity 0: so on a
 * real browser the hero shipped visible, was read, and then blinked out for
 * half a second before fading back. Measured on the built export, forcing the
 * class on and reading the resolved opacity back: 1 in the shipped markup, 0
 * the instant the class lands.
 *
 * So each hook asks one question before it arms anything: was this element in
 * the viewport when the page hydrated? If it was, the reader has already seen
 * it, and there is no entrance to run -- only content to take away and give
 * back. That element keeps the resting state it shipped with and no observer is
 * created for it. Everything below the fold is untouched by this and enters on
 * scroll exactly as before, because nothing has painted it yet.
 *
 * The check can only ever withhold the class, never add it, so the first rule
 * survives intact: the hidden state is still reachable only from inside a frame.
 *
 * The class is added imperatively rather than through React state: these
 * wrappers never re-render for any other reason, and going through state would
 * put a render between the frame callback and the style change for no gain.
 */

/** Reduced motion is a content preference here: no class, so no hidden state. */
function still(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Has the reader already seen this element?
 *
 * Called once, at hydration, which is after the browser's first paint, so a box
 * that overlaps the viewport now is a box that has been on screen. Deliberately
 * the real viewport rather than the margin the observer below uses to trigger:
 * the question is what was painted, not what is close enough to start.
 */
function painted(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const h = window.innerHeight || document.documentElement.clientHeight;
  const w = window.innerWidth || document.documentElement.clientWidth;
  return r.bottom > 0 && r.top < h && r.right > 0 && r.left < w;
}

/** Add `is-entering` when the element first scrolls into view, once. */
function useEntranceInView(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || still()) return;

    // On screen already: see the second rule at the top of this file. The
    // reader is looking at this content, so there is nothing to enter.
    if (painted(el)) return;

    // No IntersectionObserver means no way to know when to start, and the
    // element is already visible, so there is nothing to do.
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-entering");
          io.unobserve(entry.target);
        }
      },
      // The same negative margin the old viewport option used: an element
      // starts its entrance a little after its top edge appears rather than the
      // instant it does, so the motion is read rather than missed.
      { rootMargin: "-72px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/**
 * Scroll reveal.
 *
 * `y` is the distance travelled, passed to CSS rather than to a tween, so the
 * value lives on the element and the animation is one keyframe rule shared by
 * every reveal on the site.
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
  const ref = useRef<HTMLDivElement>(null);
  useEntranceInView(ref);
  return (
    <div ref={ref} className={className ? `reveal ${className}` : "reveal"} style={vars(y, delay)}>
      {children}
    </div>
  );
}

/**
 * The hero's wrapper.
 *
 * It used to run its entrance from a `requestAnimationFrame` on load. That
 * callback cannot arrive before the browser has painted the hero -- it is the
 * hero, it is always in the first viewport -- so what it produced was never an
 * entrance, only the blink described at the top of this file. It takes the same
 * guarded hook as everything else now, which declines for anything already on
 * screen, and the hero is always on screen. The site's motion therefore begins
 * at the first thing the reader scrolls to, which is the first thing that has
 * an unpainted state to move from.
 */
export function Enter({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEntranceInView(ref);
  return (
    <div ref={ref} className={className ? `reveal ${className}` : "reveal"} style={vars(12, delay)}>
      {children}
    </div>
  );
}

/**
 * A grid or list whose children arrive one after another.
 *
 * The parent owns the timing, so a cell's delay comes from its position rather
 * than from a hand-written number per cell. The parent is not itself animated:
 * it takes the class and the children's rule keys off it, which keeps the
 * layout element free of a transform that would otherwise create a containing
 * block for anything positioned inside it.
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
  const ref = useRef<HTMLDivElement>(null);
  useEntranceInView(ref);
  return (
    <div
      ref={ref}
      className={className ? `reveal-group ${className}` : "reveal-group"}
      style={
        {
          "--reveal-step": `${step}s`,
          "--reveal-delay": `${delay}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

/**
 * One cell of a `Stagger`. Inert on its own, so it needs the parent: the CSS
 * rule that animates it is a child selector under the parent's class.
 */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `reveal-item ${className}` : "reveal-item"}>{children}</div>;
}

/** The two values the keyframe rule reads off the element. */
function vars(y: number, delay: number): React.CSSProperties {
  return {
    "--reveal-y": `${y}px`,
    "--reveal-delay": `${delay}s`,
  } as React.CSSProperties;
}
