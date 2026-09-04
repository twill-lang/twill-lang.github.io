"use client";

import { useState } from "react";

/**
 * The shape checker, made of the site instead of described by it.
 *
 * twill's whole claim is that a shape mistake is known before the program runs.
 * The page used to make that claim in a paragraph and then show a screenshot of
 * an error, which asks the reader to take both on trust. Here the reader edits a
 * dimension in the signature and watches the refusal rewrite itself and then go
 * away, which is the same sentence delivered as something they did.
 *
 * WHY THIS IS NOT A FAKE COMPILER. Shape arithmetic for `@` is one rule: the
 * inner dimensions have to agree. Reimplementing that is not an approximation of
 * the checker, it is the same arithmetic, and the message below is the real
 * message. Every one of the sixteen states this component can be in was run
 * through `twill check` on the 1.9.0 binary and the strings here are its output
 * character for character, including the `2 |` source echo, the exit status and
 * the wording of the clean case. A browser-based playground would have to be a
 * second implementation of the evaluator and would drift; this cannot, because
 * there is nothing here to drift.
 *
 * WHY THE MOTION IS CSS AND NOT THE MOTION LIBRARY. The first version animated
 * the output with `AnimatePresence mode="wait"`, which does not mount the new
 * text until the old text has finished leaving. That makes the reader's answer
 * wait on an animation frame, and a page loaded in a background tab gets no
 * animation frames at all: pressing a dimension changed the signature and the
 * drawing and left the terminal showing the previous program's error, which is
 * the one thing on this page that must never be wrong. Everything here now
 * renders its final state directly and the animation is a CSS keyframe on top of
 * it, so an animation that never runs costs a fade and nothing else. The
 * reduced-motion rule in globals.css already switches those off.
 */

const DIMS = [1, 2, 3, 4] as const;

/** The exact text `twill check` prints for a given pair of inner dimensions. */
function checkOutput(k: number, n: number): { ok: boolean; lines: string[] } {
  if (k === n) {
    return { ok: true, lines: ["matvec.tw: no shape problems found"] };
  }
  return {
    ok: false,
    lines: [
      `matvec.tw:2: shape error: shape mismatch in @: [3, ${k}] @ [${n}] (inner ${k} != ${n})`,
      "  2 |   A @ x",
    ],
  };
}

/**
 * A dimension in the signature, as a control.
 *
 * A real button rather than a styled span: it is reached by Tab, it steps with
 * the arrow keys, and `.dim-button` pads it to 44px in both directions without
 * opening the line of code up to twice its height.
 */
function Dim({
  value,
  onChange,
  label,
  tone,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  tone: "ok" | "bad";
}) {
  const step = (by: number) => {
    const i = DIMS.indexOf(value as (typeof DIMS)[number]);
    onChange(DIMS[(i + by + DIMS.length) % DIMS.length]);
  };

  return (
    <button
      type="button"
      className={`dim-button ${tone === "bad" ? "is-bad" : "is-ok"}`}
      aria-label={`${label}, currently ${value}. Press to change it.`}
      onClick={() => step(1)}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
          e.preventDefault();
          step(1);
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
          e.preventDefault();
          step(-1);
        }
      }}
    >
      {value}
    </button>
  );
}

/**
 * The two operands, drawn.
 *
 * `[3, k] @ [n]` is a picture before it is a rule: two blocks whose touching
 * edges either have the same number of cells or do not. The seam between them
 * carries the whole judgement, so it is the only thing coloured.
 */
function Operands({ k, n, ok }: { k: number; n: number; ok: boolean }) {
  return (
    <div className="tensor-figure" aria-hidden>
      <figure className="tensor-block">
        <div className="tensor-grid" style={{ gridTemplateColumns: `repeat(${k}, 1fr)` }}>
          {Array.from({ length: 3 * k }, (_, i) => (
            <span key={i} className="tensor-cell" />
          ))}
        </div>
        <figcaption className="tensor-caption">
          A <span className="tensor-dim">[3, {k}]</span>
        </figcaption>
      </figure>

      <div className={`tensor-seam ${ok ? "is-ok" : "is-bad"}`}>
        <span className="tensor-op">@</span>
        <span className="tensor-verdict">
          {k} {ok ? "=" : "≠"} {n}
        </span>
      </div>

      <figure className="tensor-block">
        <div className="tensor-grid" style={{ gridTemplateColumns: "1fr" }}>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="tensor-cell" />
          ))}
        </div>
        <figcaption className="tensor-caption">
          x <span className="tensor-dim">[{n}]</span>
        </figcaption>
      </figure>

      <div className={`tensor-seam is-quiet ${ok ? "is-ok" : "is-bad"}`}>
        <span className="tensor-op">=</span>
      </div>

      <figure className="tensor-block">
        <div className="tensor-grid" style={{ gridTemplateColumns: "1fr" }}>
          {ok ? (
            Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="tensor-cell is-result" />
            ))
          ) : (
            <span className="tensor-void">refused</span>
          )}
        </div>
        <figcaption className="tensor-caption">
          {ok ? (
            <>
              A @ x <span className="tensor-dim">[3]</span>
            </>
          ) : (
            <span className="tensor-dim">nothing runs</span>
          )}
        </figcaption>
      </figure>
    </div>
  );
}

export function ShapeLab() {
  // The initial state is the mismatch, deliberately. It is the state the static
  // HTML ships in, so a reader with no JavaScript still gets a real signature
  // and the real error it produces, and the refusal is the thing worth arriving
  // at rather than the thing to be led away from.
  const [k, setK] = useState(2);
  const [n, setN] = useState(3);

  const { ok, lines } = checkOutput(k, n);
  const tone = ok ? "ok" : "bad";

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="lab-panel themed">
        <div className="lab-head">
          <span className="size-1.5 rounded-full bg-brand-fill" aria-hidden />
          <span className="t-eyebrow opacity-70">matvec.tw</span>
          <span className="lab-hint">click a dimension</span>
        </div>

        <pre className="lab-source">
          <code className="font-mono">
            <span className="tok-kw">fn</span> <span className="tok-fn">matvec</span>(A: [
            <span className="tok-num">3</span>,{" "}
            <Dim value={k} onChange={setK} label="the inner dimension of A" tone={tone} />
            ], x: [<Dim value={n} onChange={setN} label="the length of x" tone={tone} />]) {"->"} [
            <span className="tok-num">3</span>] {"{"}
            {"\n  A @ x\n"}
            {"}"}
          </code>
        </pre>

        <Operands k={k} n={n} ok={ok} />
      </div>

      <div className="lab-term">
        <div
          className="lab-head"
          style={{ borderColor: "var(--term-edge)", background: "var(--term-shell)" }}
        >
          <span className="size-1.5 rounded-full" style={{ background: "var(--teal)" }} aria-hidden />
          <span className="t-eyebrow opacity-70">twill check</span>
        </div>
        <pre className="lab-out">
          <code className="font-mono">
            <span className="opacity-60">$ twill check matvec.tw</span>
            {"\n"}
            {/* aria-live so the answer reaches a screen reader, which otherwise
                gets a button whose only effect is somewhere else on the page. */}
            <span aria-live="polite">
              {/* The key remounts this on every change, which replays the CSS
                  entrance. The text itself is never waiting on it. */}
              <span className="lab-line" key={lines.join("|")}>
                <span className={ok ? "lab-ok" : "lab-bad"}>{lines[0]}</span>
                {lines[1] ? `\n${lines[1]}` : ""}
              </span>
            </span>
            {"\n"}
            <span className="opacity-60">{`$ echo $?\n${ok ? "0" : "1"}`}</span>
          </code>
        </pre>
      </div>
    </div>
  );
}
