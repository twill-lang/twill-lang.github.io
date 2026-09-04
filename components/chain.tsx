import { Stagger, StaggerItem } from "@/components/motion";

/**
 * The bootstrap chain, drawn.
 *
 * This is the strongest claim on the site and it used to be three paragraphs in
 * a bordered box, which is the one shape that makes a chain of stages hard to
 * read. It is a chain, so it is drawn as one.
 *
 * Drawn in HTML and CSS rather than SVG on purpose: an SVG with text in it is a
 * fixed aspect ratio and either overflows or shrinks its labels below legibility
 * on a phone. These stages are boxes with connectors, so they reflow to a
 * vertical run at the narrow end and the connectors turn with them, and every
 * word in the figure is selectable text a screen reader can read in order.
 *
 * The last stage is deliberately dashed. Every number here is from the twill
 * repo's own CHANGELOG and docs/self-hosting.md, and the honest state is that
 * the self-hosted tree runs ON the Go bootstrap and reproduces it, and that the
 * Go-free binary is the stage after this one.
 */

type Stage = {
  n: string;
  title: string;
  body: string;
  evidence?: string;
  pending?: boolean;
};

const STAGES: Stage[] = [
  {
    n: "01",
    title: "The compiler, in twill",
    body: "src/*.tw: lexer, parser, checker, formatter, evaluator, tensor kernels and CLI, all written in the language, all in the systems half of it.",
    evidence: "The whole src/ and std/ tree type-checks clean",
  },
  {
    n: "02",
    title: "Run by the Go bootstrap",
    body: "The Go implementation plays the part OCaml played for Rust: it is the compiler that runs the compiler. It is interpreted and it is slow, and neither matters for the check being made.",
    evidence: "Since v1.4.0",
  },
  {
    n: "03",
    title: "Compared against the reference, byte for byte",
    body: "The same corpus goes through both implementations and the output is diffed. Not a sample of it, and not a summary: the bytes.",
    evidence: "check matches on all 443 corpus files; fmt on all 89 it formats, and a 461-file corpus test holds fmt to parsing, idempotence and keeping every comment",
  },
  {
    n: "04",
    title: "A binary with no Go in it",
    body: "The triple build: the compiler compiles itself, and the artifact its own output produces is compared with the one produced by that output. The fixed point is the proof, and it is the stage after this one.",
    evidence: "Not done",
    pending: true,
  },
];

export function BootstrapChain() {
  return (
    <Stagger className="chain" step={0.07}>
      {STAGES.map((s) => (
        <StaggerItem key={s.n} className={`chain-step${s.pending ? " is-pending" : ""}`}>
          <div className="chain-rail" aria-hidden>
            <span className="chain-dot" />
            <span className="chain-line" />
          </div>
          <div className="chain-body">
            <p className="t-eyebrow chain-index">{s.n}</p>
            <h3 className="chain-title">{s.title}</h3>
            <p className="chain-text">{s.body}</p>
            {s.evidence && (
              <p className="chain-evidence">
                <span className="chain-evidence-mark" aria-hidden />
                {s.evidence}
              </p>
            )}
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
