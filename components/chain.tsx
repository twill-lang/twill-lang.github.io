import { Stagger, StaggerItem } from "@/components/motion";
import { corpus } from "@/lib/corpus";

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
 * The last stage is deliberately dashed. The honest state is that the
 * self-hosted tree runs ON the Go bootstrap and reproduces it, and that the
 * Go-free binary is the stage after this one.
 *
 * NO NUMBER IN THIS FIGURE IS TYPED HERE. Stage 03 used to read "443 corpus
 * files", "fmt on all 89 it formats" and "a 461-file corpus test", all three
 * copied out of the v1.4.0 changelog entry of 11 August 2026 and shown as the
 * state of things now. lib/corpus.ts counts both corpora out of the repository
 * at build time, through the definitions the repository itself holds them to,
 * so the figure is as current as the build that produced it or the build fails.
 */

type Stage = {
  n: string;
  title: string;
  body: string;
  evidence?: string;
  pending?: boolean;
};

/** `evidence` is filled in from the repository for the stage that has a count. */
const STAGES: Stage[] = [
  {
    n: "01",
    title: "The compiler, in twill",
    body: "src/*.tw: lexer, parser, checker, formatter, evaluator, tensor kernels and CLI, all written in the language, all in the systems half of it.",
    // Not a claim from a release note: internal/checker/agreement_test.go walks
    // src/, std/ and examples/ on every `go test ./...` and fails on a single
    // diagnostic from any file in them.
    evidence:
      "Every file in src/, std/ and examples/ draws no diagnostic, and a test in the repository walks them to say so",
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
    // Filled in below, from the repository.
  },
  {
    n: "04",
    title: "A binary with no Go in it",
    body: "The triple build: the compiler compiles itself, and the artifact its own output produces is compared with the one produced by that output. The fixed point is the proof, and it is the stage after this one.",
    evidence: "Not done",
    pending: true,
  },
];

export async function BootstrapChain() {
  const counted = await corpus();

  // The one stage whose evidence is a measurement rather than a statement, so
  // the sentence is assembled here from what the repository holds today.
  const stages = STAGES.map((s) =>
    s.n === "03"
      ? {
          ...s,
          evidence:
            `check is held to every .tw file under ${counted.differentialRoot}/, ` +
            `${counted.differential} of them today; fmt to the ${counted.formatter} files ` +
            "its own corpus test globs. Both counted out of the repository when this page was built",
        }
      : s,
  );

  return (
    <Stagger className="chain" step={0.07}>
      {stages.map((s) => (
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
