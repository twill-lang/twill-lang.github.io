"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "@/components/icons";

/**
 * The inline script that settles the temper before first paint.
 *
 * It runs in <head>, ahead of the body, so the right ground colour is on <html>
 * by the time anything is painted; reading localStorage from an effect after
 * hydration would flash the other temper first. A stored choice wins, and with
 * nothing stored the attribute is left off entirely, which hands the decision
 * back to the prefers-color-scheme rule in globals.css. That is why there are
 * three states here and only two buttons: system is the absence of a choice,
 * not a third value to store.
 *
 * The try/catch is around localStorage alone. Safari in private mode throws on
 * read, and a stylesheet failing to pick a temper must not take the page with
 * it.
 */
export const themeScript = `(()=>{try{var t=localStorage.getItem("twill-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

type Theme = "light" | "dark";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function currentTheme(): Theme {
  const set = document.documentElement.getAttribute("data-theme");
  return set === "dark" || set === "light" ? set : systemTheme();
}

/**
 * A sun/moon switch.
 *
 * Renders a blank well until mounted, because the temper is only knowable in
 * the browser and server markup claiming either one would be a hydration
 * mismatch on half of all visits. The well is the button's own size, so nothing
 * in the nav shifts when the glyph arrives.
 *
 * While no choice has been stored this also follows the OS: a reader who
 * changes their system theme with the page open sees it change. Once they press
 * the button the listener stops mattering, since data-theme then wins in the
 * stylesheet regardless.
 *
 * The button is `.icon-button`: 44px of target rather than the 32 it was, with
 * the ground drawn on hover instead of a permanent border, so the nav does not
 * gain a third boxed control at the larger size.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const still = useReducedMotion();

  useEffect(() => {
    setTheme(currentTheme());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (!document.documentElement.hasAttribute("data-theme")) {
        setTheme(systemTheme());
      }
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("twill-theme", next);
    } catch {
      /* private mode: the choice holds for this page and is not persisted */
    }
    setTheme(next);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === null
          ? "Toggle colour theme"
          : isDark
            ? "Switch to the light theme"
            : "Switch to the dark theme"
      }
      className={`icon-button ${className}`}
    >
      {theme === null ? (
        <span className="size-4" aria-hidden />
      ) : (
        <motion.span
          key={theme}
          aria-hidden
          /* No opacity in the initial state, on purpose, and it is the same
             rule the rest of this site follows: a tween's start state is
             written into the element, and a tween needs frames. With opacity
             in here, a browser that hydrates and then does not paint left the
             sun or moon glyph invisible inside a button that still claimed to
             have one. Frozen at this first keyframe it is a slightly turned,
             slightly small icon, which is legible. */
          initial={still ? false : { rotate: -75, scale: 0.7 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center"
        >
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
        </motion.span>
      )}
    </button>
  );
}
