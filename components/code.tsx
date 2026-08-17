import { highlight } from "@/lib/highlight";

function Panel({
  label,
  tone,
  children,
}: {
  label?: string;
  tone: "source" | "output";
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-code-edge bg-[var(--code-ground)]">
      {label && (
        <div className="flex items-center gap-2 border-b border-code-edge bg-shell px-4 py-2">
          <span
            className="size-1.5 rounded-full"
            style={{ background: tone === "source" ? "var(--accent)" : "var(--teal)" }}
            aria-hidden
          />
          <span className="t-eyebrow text-[var(--code-text)]/55">{label}</span>
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
      <code className="font-mono text-[var(--code-text)]">{highlight(children.trim())}</code>
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
      <code className="font-mono text-[var(--code-text)]/80">{children.trim()}</code>
    </Panel>
  );
}
