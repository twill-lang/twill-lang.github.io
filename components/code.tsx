import { highlight } from "@/lib/highlight";

/**
 * The two panel tones are now genuinely two grounds, which they were not.
 *
 * A source listing follows the temper: paper under light, deep under dark. Six
 * dark slabs down a near-white page were the heaviest thing on it, and the
 * syntax palette they carried was picked to sit on #071a16.
 *
 * A terminal stays a terminal in both. Its colours are pinned here rather than
 * taken from the temper, because that is what `$ twill check` looks like, and
 * because the figures on the home page are pairs: source beside the output it
 * produced. When both panels were the same ground, that pairing had nothing to
 * carry it but the label.
 */
function Panel({
  label,
  tone,
  children,
}: {
  label?: string;
  tone: "source" | "output";
  children: React.ReactNode;
}) {
  const term = tone === "output";
  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-[var(--shadow-1)] ${
        term ? "term-panel" : "themed"
      }`}
      style={
        term
          ? {
              borderColor: "var(--term-edge)",
              background: "var(--term-ground)",
              color: "var(--term-text)",
            }
          : {
              borderColor: "var(--code-edge)",
              background: "var(--code-ground)",
              color: "var(--code-text)",
            }
      }
    >
      {label && (
        <div
          className="flex items-center gap-2 border-b px-4 py-2"
          style={{
            borderColor: term ? "var(--term-edge)" : "var(--code-edge)",
            background: term ? "var(--term-shell)" : "var(--shell)",
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: term ? "var(--teal)" : "var(--brand-fill)" }}
            aria-hidden
          />
          <span className="t-eyebrow" style={{ color: "currentColor", opacity: 0.62 }}>
            {label}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[13px] leading-[1.7] sm:p-5">{children}</pre>
    </div>
  );
}

/** A .tw source block, syntax coloured. */
export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <Panel label={label} tone="source">
      <code className="font-mono">{highlight(children.trim())}</code>
    </Panel>
  );
}

/**
 * Terminal output. Not coloured: this is what the tool printed, and colouring
 * it as if it were source would misrepresent which half is which.
 */
export function Term({ children, label }: { children: string; label?: string }) {
  return (
    <Panel label={label} tone="output">
      <code className="font-mono opacity-85">{children.trim()}</code>
    </Panel>
  );
}
