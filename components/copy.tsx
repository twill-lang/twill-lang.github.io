"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@/components/icons";

/**
 * Copy the text this button was given.
 *
 * Every code panel on the site was previously a thing to read rather than a
 * thing to use, which for an install command is the difference between a
 * documentation site and a screenshot of one.
 *
 * Two details worth keeping. The button reserves its own size and swaps only the
 * glyph, so the panel header does not shift when the tick appears. And the
 * timeout is cleared on unmount, because a reader who navigates away between the
 * click and the reset would otherwise get a setState on a gone component.
 */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // No clipboard permission, or an insecure origin. Saying nothing is
      // better than an alert; the text is on the screen and selectable.
      return;
    }
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="copy-button"
      aria-label={done ? "Copied" : label}
      title={done ? "Copied" : label}
    >
      <span className="copy-glyph" aria-hidden>
        {done ? <Check size={14} /> : <Copy size={14} />}
      </span>
    </button>
  );
}
