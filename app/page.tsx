import Link from "next/link";
import { Code, Term } from "@/components/code";
import { Enter, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Footer, Nav } from "@/components/chrome";
import { ArrowRight, ArrowUpRight, Book, Download } from "@/components/icons";

const GH = "https://github.com/twill-lang/twill";

const MONTE_CARLO = `
seed(42)
let Z = randn(200000)                              # fixed shocks: the price is smooth in its inputs

fn call_price(S0, K, r, sigma, T) {
  let drift = (r - 0.5 * sigma * sigma) * T
  let ST = S0 * exp(drift + sigma * sqrt(T) * Z)   # simulated terminal prices
  exp(-r * T) * mean(relu(ST - K))                 # discounted expected payoff
}

let price = call_price(100.0, 100.0, 0.05, 0.2, 1.0)
let delta = grad(fn(s) = call_price(s, 100.0, 0.05, 0.2, 1.0))(100.0)
let vega  = grad(fn(v) = call_price(100.0, 100.0, 0.05, v, 1.0))(0.2)
`;

const MONTE_CARLO_OUT = `
$ twill examples/montecarlo_option.tw
European call, S0=100 K=100 r=5% vol=20% T=1y, MC paths: 200000
  price = 10.442696  (Black-Scholes 10.4506)
  delta = 0.636269  (Black-Scholes 0.6368)
  vega  = 37.488476   (Black-Scholes 37.524)
`;

const SHAPE_SIG = `
fn matvec(A: [3, 2], x: [2]) -> [3] {
  A @ x
}
`;

const SHAPE_OUT = `
$ twill check model.tw
model.tw:6: shape error: argument 2 ("x") axis 0 is 3 but the signature expects 2
  6 | let out = matvec(A, [1.0, 2.0, 3.0])
model.tw:2: shape error: shape mismatch in @: [3, 2] @ [3] (inner 2 != 3)
  2 |   A @ x
`;

const UNITS = `
unit USD
unit share

fn notional(px: USD/share, qty: share) -> USD { px * qty }

let price: USD/share = 150.0
let value = notional(price, 200.0)   # USD
`;

const PATTERNS_TW = `
mode systems

struct Pair[A, B] { left: A, right: B }      # a declaration of your own, generic

fn describe(e: Expr) -> Str {
  match e {
    Num(v) if v < 0.0 => "a negative constant",   # a guard
    Num(0.0) => "zero",                           # a literal pattern
    Neg(Neg(inner)) => describe(inner),           # a nested pattern
    Mul(p) => "a product",
    other => "something else",                    # a catch-all with a name
  }
}
`;

const MATCH_OUT = `
$ twill check load.tw
load.tw:14: shape error: match on Opt is not exhaustive: missing Some(Err)
 14 |   match o {
load.tw:31: shape error: "b" is declared Box[I64] but the value is Box[Str]
`;

/* The two things 1.7 closed. Both were the top of docs/needs.md's open list,
   and both landed on the Go bootstrap and in the self-hosted compiler together,
   which is the check this project exists to be able to make. */
const COMPLETENESS = [
  {
    title: "A pattern was a case name and one binder",
    body: "It is a tree now. Ok(Some(v)) takes a value apart in one place instead of a second match inside the arm; 3, \"hi\" and true match by ordinary equality, so a match over numbers needs no enum written around it; and Some(n) if n > 0 says the thing a shape cannot. A lower-case name binds rather than naming a case, so a catch-all can say what it caught -- and since every variant in the language and its libraries is upper-case initial, nothing written before changes meaning.",
  },
  {
    title: "Exhaustiveness got more precise, not just still true",
    body: "It recurses: Some(Ok(v)), Some(Err(e)) and None cover an Opt[Res[..]], and dropping one names the value that gets through rather than passing. The rule underneath is that an arm counts only when nothing but the value's shape decides whether it runs -- so a guarded arm and a narrower nested one prove nothing, and Some(v) if v > 3 together with None is reported as incomplete. That is stricter than 1.6 was, and correct.",
  },
  {
    title: "Only four types could be generic",
    body: "Arr, Dict, Opt and Res were generic and checked; a declaration in a twill program could not be, and [ after the name was a syntax error. struct Box[T], enum Tree[T] and fn first[T](xs: Arr[T]) -> T now parse, check and run. A Box[I64]'s field is an I64 rather than an unknown, substitution goes under the constructors a parameter is written inside, and a Box[Str] is refused where a Box[I64] was declared.",
  },
  {
    title: "And no monomorphization, which turned out not to be needed",
    body: "The original plan assumed it. The runtime is a tree walker over dynamically typed values, so the same code runs whatever T is and specialising per instantiation would produce identical copies. The parameters have to reach exactly one place -- the types the checker judges against -- so generics here are substitution in about eighty lines per implementation, and the termination question monomorphization would have raised does not arise.",
  },
];

/* The tooling half. Shorter entries, so a compact list rather than cards. */
const TOOLING = [
  ["twill lsp", "A language server: diagnostics republished as you type, formatting, and hover reporting the inferred type and shape. Hover is the one worth having -- in a tensor-first language the question you actually have is what shape something is, and it is answered from the checker without running anything. No completion, deliberately, until the semantic information is reliable enough to drive one."],
  ["std/gradcheck", "A gradient checker. There is nothing about a wrong gradient that looks wrong: the model does not crash, it trains to a worse loss, and the search starts at the learning rate. Compares against a central difference quotient, deliberately not built out of grad."],
  ["twill doctor", "Answers the question a bug report starts with, and finds what is wrong quietly: a stale binary earlier on PATH, a TWILL_STD pointing at last month's checkout, a standard library that will not load."],
  [":type and :shape", "Answer from the checker in the REPL without running anything, which for a tensor-first language is the most useful question there is. :shape randn(4096, 4096) @ w costs nothing here and a gigabyte there."],
  ["The filesystem, finished", "path_exists, mkdir_all, remove_all, rename, mtime, temp_dir, cwd and the seven path operations. A program could read a file and write one, and could not make a directory to write into or clean up after itself. Plus read_file_at, a ranged read: read_file returns the whole file, so a reader following a growing log read all of it again on every poll, and one processing a file larger than memory could not run at all."],
  ["mono_ns()", "A clock that only goes forward. The wall clock steps when the system time is corrected, so a duration measured across one is wrong by the correction -- for a benchmark, the difference between a number and a fiction."],
  ["twill test --filter", "Runs the suites whose path contains a substring, alongside twill --version --verbose printing the build."],
];

const PILLARS = [
  {
    title: "Tensors are the primitive",
    body: "Every number is a rank-0 tensor, vectors and matrices are literals, and @ is matrix multiply. Broadcasting follows NumPy rules, and the gradients broadcast back correctly.",
  },
  {
    title: "grad is a builtin",
    body: "Backed by a real reverse-mode engine that follows the structure of its argument. A model held in a list gets a list of gradients back; a model in a record gets a record. No tape, no requires_grad, no .backward().",
  },
  {
    title: "Shapes and units are static",
    body: "[2,3] @ [4] is an error you see before the program runs, not a stack trace forty minutes into training. Dollars plus shares is refused the same way, and units cost nothing at runtime.",
  },
];

const ECOSYSTEM = [
  { name: "twill", blurb: "The language and the reference implementation.", href: `${GH}` },
  { name: "spool", blurb: "The package manager, written in twill.", href: "https://github.com/twill-lang/spool" },
  { name: "loom", blurb: "The build and workspace tooling.", href: "https://github.com/twill-lang/loom" },
  { name: "warp", blurb: "Data pipelines and dataset loaders.", href: "https://github.com/twill-lang/warp" },
  { name: "weft", blurb: "Plotting and visualisation: terminal charts and SVG.", href: "https://github.com/twill-lang/weft" },
  { name: "skein", blurb: "Tokenisers with an offset map back to the source.", href: "https://github.com/twill-lang/skein" },
  { name: "heddle", blurb: "Probabilistic programming: NUTS, HMC, ADVI.", href: "https://github.com/twill-lang/heddle" },
  { name: "shuttle", blurb: "Inference and serving.", href: "https://github.com/twill-lang/shuttle" },
  { name: "selvedge", blurb: "Model serialisation and the model registry.", href: "https://github.com/twill-lang/selvedge" },
  { name: "bobbin", blurb: "Shared internals across the ecosystem.", href: "https://github.com/twill-lang/bobbin" },
];

const NOT_DONE = [
  "It is interpreted. Tensor ops loop in Go, and there is no vectorized or GPU backend.",
  "Autodiff is reverse-mode and first-order. A gradient inside a gradient is refused wherever it is written, rather than answered with zeros; hessian and jacobian nest legitimately.",
  "The shape checker is best-effort, not a full type system. The systems-mode types are checked as of 1.6, but only where a mismatch is certain: an unresolved type is left alone rather than treated as an error.",
  "The self-hosted compiler runs on the Go bootstrap, not yet as its own Go-free binary.",
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="pb-20 pt-16 sm:pb-28 sm:pt-24">
          <Enter>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/twill-mark.svg" alt="twill" width={44} height={44} />
              <a
                href={`${GH}/releases/tag/v1.7.1`}
                className="chip chip-brand t-eyebrow transition-colors"
              >
                v1.7.1
              </a>
              <span className="chip t-eyebrow">MIT licensed</span>
              <span className="chip t-eyebrow">Early prototype</span>
            </div>
          </Enter>
          <Enter delay={0.08}>
            <h1 className="t-display mt-10 max-w-[22ch] text-balance">
              A language where tensors are the primitive.
            </h1>
          </Enter>
          <Enter delay={0.14}>
            <p className="t-lead mt-6 max-w-[52ch]">
              twill is a small language where{" "}
              <code className="font-mono text-brand">grad</code> is built in and a shape
              mistake is an error you see before the program runs.
            </p>
          </Enter>
          <Enter delay={0.2}>
            <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-muted">
              Most machine-learning code is a language plus a numeric framework bolted on
              top. twill goes the other way: differentiation is a language operation rather
              than a library call, and a static checker reads your shapes before anything
              executes.
            </p>
          </Enter>
          <Enter delay={0.28}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/docs/tutorial/"
                className="group inline-flex items-center gap-2 rounded-lg bg-brand-fill px-5 py-2.5 text-sm font-medium text-on-brand transition-transform hover:scale-[1.02] active:scale-[0.99]"
              >
                Start the tutorial
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={`${GH}/releases`}
                className="inline-flex items-center gap-2 rounded-lg border border-edge px-5 py-2.5 text-sm font-medium transition-colors hover:border-brand-fill"
              >
                <Download size={16} />
                Download a binary
              </a>
            </div>
          </Enter>
          <Enter delay={0.34}>
            <div className="mt-5 max-w-full overflow-x-auto rounded-lg border border-edge px-4 py-3 font-mono text-[13px] text-muted">
              <span className="select-none text-brand">$ </span>
              <span className="whitespace-pre">go install github.com/twill-lang/twill/cmd/twill@latest</span>
            </div>
          </Enter>
        </section>

        <Section
          n="01"
          eyebrow="The whole of it"
          title="Price a European call, then differentiate the pricer for its Greeks"
          lead="No bumping, no second library. grad went through 200,000 simulated paths, a relu payoff and a mean, and landed on the closed-form Greeks."
        >
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
            <Code label="montecarlo_option.tw">{MONTE_CARLO}</Code>
            <Term label="output">{MONTE_CARLO_OUT}</Term>
          </div>
        </Section>

        <Section
          n="02"
          eyebrow="Before anything runs"
          title="The most useful thing twill does is refuse to start"
          lead="twill check infers tensor shapes across the whole program and reports the ones that cannot line up. Parameters can carry shape annotations, which turn a contract into something the checker enforces at every call site."
        >
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <Code label="model.tw">{SHAPE_SIG}</Code>
            <Term label="twill check">{SHAPE_OUT}</Term>
          </div>
          <p className="mt-6 max-w-[70ch] text-sm leading-relaxed text-muted">
            A dimension can be a literal, or a name. A name used more than once must be the
            same size, which is what lets the checker verify the return type of{" "}
            <code className="font-mono text-brand">fn mm(A: [n, k], B: [k, m]) -&gt; [n, m]</code>.
            The checker only flags a mismatch when it is certain: code whose shapes depend
            on runtime values is left alone rather than guessed at, so a clean run means
            what it says.
          </p>
        </Section>

        <Section n="03" eyebrow="Why" title="Three things fall out of building the language around it">
          <Stagger className="hairline-grid grid sm:grid-cols-3">
            {PILLARS.map((p, i) => (
              <StaggerItem key={p.title} className="bg-raised p-6">
                <span className="t-eyebrow text-brand">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{p.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>

        <Section
          n="04"
          eyebrow="Units of measure"
          title="Price times quantity is money; dollars plus shares is refused"
          lead="Declare base units, annotate quantities, and the checker tracks units through arithmetic. Units are erased at runtime and cost nothing."
        >
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <Code label="notional.tw">{UNITS}</Code>
            <Term label="twill check">{`$ twill check bad.tw\nbad.tw:6: shape error: unit mismatch: USD*share^-1 + share\n  6 | let bad = price + qty`}</Term>
          </div>
        </Section>

        <Section
          n="05"
          eyebrow="New in 1.7"
          title="The two open questions: what a pattern is, and what can be generic"
          lead="1.5 made the ecosystem run and 1.6 stopped the language having pieces missing from the middle. This one closes the two entries docs/needs.md called the largest open language questions, and closes them on the Go bootstrap and in the self-hosted compiler together. Nothing written before changes meaning: both are additions at positions that were previously syntax errors. Shipped as v1.7.0 on 20 August 2026."
        >
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <Code label="patterns.tw">{PATTERNS_TW}</Code>
            <Term label="twill check">{MATCH_OUT}</Term>
          </div>

          <Stagger className="hairline-grid mt-8 grid sm:grid-cols-2">
            {COMPLETENESS.map((c, i) => (
              <StaggerItem key={c.title} className="bg-raised p-6">
                <span className="t-eyebrow text-brand">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{c.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{c.body}</p>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal>
            <div className="mt-8">
              <p className="t-eyebrow text-faint">And the tooling around it</p>
              <dl className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
                {TOOLING.map(([name, blurb]) => (
                  <div key={name} className="border-t border-edge pt-3">
                    <dt className="font-mono text-sm font-semibold text-brand">{name}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted">{blurb}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>

          <Reveal>
            <p className="mt-8 max-w-[74ch] text-sm leading-relaxed text-muted">
              The release is the two candidates that made it. rc1 was the language work
              above; rc2 is what nine repositories found when they were moved onto rc1 and
              made to use it, and none of those findings was reachable from twill&rsquo;s own
              sources. Between rc2 and the tag the compiler did not change -- what changed
              is that those nine now run their suites against it in CI rather than on one
              developer&rsquo;s machine: 60 suites, nine repositories, green. Across them{" "}
              <code className="font-mono text-brand">twill check</code> reports 10 unresolved
              names, all of them primitives that genuinely do not exist yet, down from 31.
              Systems-mode code can newly fail to check, which is the point of the release.
              Three run-time behaviours change for a program relying on them: an{" "}
              <code className="font-mono text-brand">I64</code> division or modulo by zero is
              an error rather than an infinity or a NaN,{" "}
              <code className="font-mono text-brand">%</code> on two{" "}
              <code className="font-mono text-brand">I64</code>s takes the sign of the
              dividend, and a failing <code className="font-mono text-brand">?</code> at the
              top level stops with a message rather than exiting 0.
            </p>
          </Reveal>
        </Section>

        <Section n="06" eyebrow="Self-hosting" title="twill is being written in twill">
          <Reveal>
            <div className="rounded-xl border border-brand-fill/35 bg-raised p-6 sm:p-8">
              <p className="max-w-[72ch] text-sm leading-relaxed text-muted">
                As of v1.5.0 this runs. The lexer, parser, checker, evaluator, tensor
                kernels, formatter and CLI are written in the language itself, and the whole
                tree executes on the Go bootstrap and reproduces the reference across every
                stage: <code className="font-mono text-brand">twill check</code> matched the
                Go command byte for byte on every corpus file, and{" "}
                <code className="font-mono text-brand">twill fmt</code> on every one it
                formats.
              </p>
              <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-muted">
                1.6 held the formatter to that claim rather than asserting it: a corpus
                test over 461 files now checks that <code className="font-mono text-brand">twill fmt</code>{" "}
                parses, is idempotent, and keeps every comment and every statement. It was
                added because the printer had no case for a{" "}
                <code className="font-mono text-brand">unit</code> declaration and{" "}
                <code className="font-mono text-brand">--write</code> was deleting them from
                the file, in the Go printer and the self-hosted one alike.
              </p>
              <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-muted">
                Designing the subset a compiler needs was the point of doing it. Writing the
                compiler first is how you find out what the subset has to be, instead of
                guessing. It has already produced a numbered work queue of what the language
                still needs, and a real bug in the reference lexer.
              </p>
              <div className="mt-6 flex flex-wrap gap-5 text-sm">
                <Link href="/docs/self-hosting/" className="text-link hover:underline">
                  How the port works
                </Link>
                <Link href="/docs/needs/" className="text-link hover:underline">
                  What is still missing
                </Link>
              </div>
            </div>
          </Reveal>
        </Section>

        <Section
          n="07"
          eyebrow="The ecosystem"
          title="Ten repositories, one language"
          lead="Everything downstream of the compiler is written in twill itself, which is the same experiment run again: a real program against the subset, with its own list of what is missing."
        >
          <Stagger className="hairline-grid grid sm:grid-cols-2" step={0.035}>
            {ECOSYSTEM.map((r) => (
              <StaggerItem key={r.name}>
                <a
                  href={r.href}
                  className="group flex h-full flex-col bg-raised p-5 transition-colors hover:bg-[color-mix(in_srgb,var(--teal)_7%,var(--raised))]"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-semibold text-brand">{r.name}</span>
                    <ArrowUpRight
                      size={15}
                      className="text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                    />
                  </span>
                  <span className="mt-1.5 text-sm leading-relaxed text-muted">{r.blurb}</span>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>

        <Section
          n="08"
          eyebrow="What is not done yet"
          title="This is a prototype, and some of it is deliberately left for later"
        >
          <Stagger className="hairline-grid grid sm:grid-cols-2">
            {NOT_DONE.map((t) => (
              <StaggerItem key={t} className="bg-raised px-5 py-4 text-sm leading-relaxed text-muted">
                {t}
              </StaggerItem>
            ))}
          </Stagger>
        </Section>

        <Section n="09" eyebrow="Read on" title="Documentation">
          <Reveal>
            <Link
              href="/docs/"
              className="group inline-flex items-center gap-2 rounded-lg bg-brand-fill px-5 py-2.5 text-sm font-medium text-on-brand transition-transform hover:scale-[1.02]"
            >
              <Book size={16} />
              Browse the docs
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </Section>
      </main>
      <Footer />
    </>
  );
}

/**
 * Section header. The label and index sit in their own column on wide screens
 * so the eye gets a fixed left edge to run down; below that breakpoint they
 * stack, because a 96px column at 375px is a wasted third of the line.
 */
function Section({
  n,
  eyebrow,
  title,
  lead,
  children,
}: {
  n: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-edge py-16 sm:py-24">
      <Reveal>
        <div className="grid gap-x-10 gap-y-4 lg:grid-cols-[7rem_minmax(0,1fr)]">
          <p className="t-eyebrow flex items-baseline gap-2 pt-1.5 text-muted lg:flex-col lg:gap-1.5">
            <span className="text-brand">{n}</span>
            <span>{eyebrow}</span>
          </p>
          <div>
            <h2 className="t-headline max-w-[24ch] text-balance">{title}</h2>
            {lead && <p className="t-lead mt-4 max-w-[62ch] text-[0.9375rem]">{lead}</p>}
          </div>
        </div>
      </Reveal>
      <div className="mt-10 lg:pl-[9.5rem]">{children}</div>
    </section>
  );
}
