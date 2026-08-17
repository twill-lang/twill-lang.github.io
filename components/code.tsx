import { highlight } from "@/lib/highlight";

/** A .tw source block, syntax coloured. */
export function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-edge bg-[var(--code-ground)] p-4 text-[13px] leading-relaxed sm:p-5 sm:text-sm">
      <code className="font-mono text-[var(--code-text)]">{highlight(children.trim())}</code>
    </pre>
  );
}

/**
 * Terminal output. Not coloured: this is what the tool printed, and colouring
 * it as if it were source would misrepresent which half is which.
 */
export function Term({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-edge bg-[var(--code-ground)] p-4 text-[13px] leading-relaxed sm:p-5 sm:text-sm">
      <code className="font-mono text-[var(--code-text)]/85">{children.trim()}</code>
    </pre>
  );
}
