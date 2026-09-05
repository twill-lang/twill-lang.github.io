import Link from "next/link";
import { Code, Term } from "@/components/code";
import { CopyButton } from "@/components/copy";
import { Enter, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Footer, Nav } from "@/components/chrome";
import { ShapeLab } from "@/components/shape-lab";
import { BootstrapChain } from "@/components/chain";
import { ArrowRight, ArrowUpRight, Book, Download } from "@/components/icons";
import { latest, longDate, releases, unreleased } from "@/lib/releases";
import { handSorts, word } from "@/lib/roadmap";

const GH = "https://github.com/twill-lang/twill";
const INSTALL = "go install github.com/twill-lang/twill/cmd/twill@latest";

/* ---------------------------------------------------------------------------
 * Every listing below was run through the twill binary before it was pasted
 * here, and every terminal block is that run's output rather than a
 * reconstruction of it. A sample that does not compile is the worst bug a
 * language's website can have, and three of the ones this page used to carry
 * were fragments that referred to types they never declared.
 *
 * The two binaries used, and why there are two: the tagged v1.9.0 build for
 * everything a visitor can download today, and a build of `main` for the
 * duplicate-definition figure, which is the one thing on this page that has
 * merged and not yet shipped. The figure says so, in the figure.
 * ------------------------------------------------------------------------- */

/* examples/montecarlo_option.tw, whole. The previous version of this listing
   was an abridgement: the prints were cut, so the program shown produced
   none of the output beside it and a reader who copied it got nothing. The
   only backslash-escape below is the one backtick in the file's own comment,
   which a template literal cannot carry raw. */
const MONTE_CARLO = `
# montecarlo_option.tw: price a European call by Monte Carlo, and get its
# Greeks (delta, vega) by differentiating the pricer. No finite differences,
# no extra libraries. \`grad\` does it.
#
# This is the finance beachhead: the payoff is parallel and simple, the result
# is reproducible (seeded RNG), and the sensitivities come straight from autodiff,
# something Python needs JAX or bumping-and-revaluing to match.

seed(42)

# Fix the standard-normal shocks once, so the price is a smooth, differentiable
# function of the inputs (common random numbers) and fully reproducible.
let paths = 200000
let Z = randn(paths)

# Terminal-value pricer for a call under geometric Brownian motion.
fn call_price(S0, K, r, sigma, T) {
  let drift = (r - 0.5 * sigma * sigma) * T
  let ST = S0 * exp(drift + sigma * sqrt(T) * Z)   # simulated terminal prices
  let payoff = relu(ST - K)                        # max(ST - K, 0)
  exp(-r * T) * mean(payoff)                       # discounted expected payoff
}

let S0 = 100.0
let K = 100.0
let r = 0.05
let sigma = 0.2
let T = 1.0

let price = call_price(S0, K, r, sigma, T)

# Greeks by autodiff: delta = dPrice/dS0, vega = dPrice/dSigma.
let delta = grad(fn(s) = call_price(s, K, r, sigma, T))(S0)
let vega = grad(fn(v) = call_price(S0, K, r, v, T))(sigma)

print("European call, S0=100 K=100 r=5% vol=20% T=1y, MC paths:", paths)
print("  price =", price, " (Black-Scholes 10.4506)")
print("  delta =", delta, " (Black-Scholes 0.6368)")
print("  vega  =", vega, "  (Black-Scholes 37.524)")
`;

const MONTE_CARLO_OUT = `
$ twill run examples/montecarlo_option.tw
European call, S0=100 K=100 r=5% vol=20% T=1y, MC paths: 200000
  price = 10.442696  (Black-Scholes 10.4506)
  delta = 0.636269  (Black-Scholes 0.6368)
  vega  = 37.488476   (Black-Scholes 37.524)
`;

/* The refusal is IN the listing now. This pair used to show a seven-line
   notional.tw with no error in it beside `$ twill check bad.tw` reporting a
   fault on a line of a file the page never showed, which is the one thing a
   figure like this must not do: the reader cannot check the claim against
   anything, and the line number points at nothing. Same program, one more
   statement, and the output below is that file's own. */
const UNITS = `
unit USD
unit share

fn notional(px: USD/share, qty: share) -> USD { px * qty }

let price: USD/share = 150.0
let qty: share = 200.0
let value = notional(price, qty)   # USD
let bad = price + qty              # USD/share plus share
`;

const UNITS_OUT = `
$ twill check notional.tw
notional.tw:9: shape error: unit mismatch: USD*share^-1 + share
  9 | let bad = price + qty              # USD/share plus share
`;

/* Same repair as notional.tw above. The listing was a clean expr.tw beside
   `$ twill check load.tw` reporting a non-exhaustive match on an Opt and a
   Box[I64]/Box[Str] mismatch, neither of which appeared anywhere on the page.
   The two faults are in this file now, one for each thing the section is
   about: a match that does not cover its enum, and a generic instantiated
   with the wrong argument. */
const PATTERNS = `
mode systems

enum Expr { Num(F64), Neg(Expr), Mul(Pair[Expr, Expr]) }

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

fn depth(e: Expr) -> I64 {
  match e {                                       # no catch-all, and two cases short
    Num(v) => 0,
  }
}

let mixed: Pair[F64, F64] = Pair { left: 1.0, right: "two" }
`;

const PATTERNS_OUT = `
$ twill check expr.tw
expr.tw:18: shape error: match on Expr is not exhaustive: missing Neg, Mul
  18 |   match e {                                       # no catch-all, and two cases short
expr.tw:23: shape error: "mixed" is declared Pair[F64, F64] but the value is Pair[F64, Str]
  23 | let mixed: Pair[F64, F64] = Pair { left: 1.0, right: "two" }
`;

const SORT = `
mode systems

struct Row { name: Str, n: I64 }

fn main() {
  let xs: Arr[I64] = [3, 1, 2]
  print(sort(xs))                        # ascending, by the elements' own order
  print(sort(xs, true))                  # descending

  let rows: Arr[Row] = [
    Row { name: "c", n: 3 },
    Row { name: "a", n: 1 },
    Row { name: "b", n: 2 },
  ]
  for r in sort(rows, fn(a, b) = a.n < b.n) {   # by a comparison: does a come first?
    print(r.name, r.n)
  }
}
`;

const SORT_OUT = `
$ twill run sort_demo.tw
[1, 2, 3]
[3, 2, 1]
a 1
b 2
c 3
`;

/* `--abbrev-ref HEAD` rather than `rev-parse --short HEAD`, which is what this
   figure ran before. The output of the short form is a commit hash, so the
   terminal block carried a hash that was current on the day it was pasted and
   is wrong the moment the compiler repository takes another commit. A branch
   name is the same demonstration and anybody can reproduce it. */
const RUN = `
mode systems

fn main() {
  let argv: Arr[Str] = ["rev-parse", "--abbrev-ref", "HEAD"]
  match run("git", argv, ".") {          # no shell: argv stays a vector
    Ok(branch) => print("checkout is on", branch),
    Err(e) => print("git said:", e),
  }
}
`;

const RUN_OUT = `
$ twill run head.tw
checkout is on main

$ TWILL_NO_EXEC=1 twill run head.tw
git said: run: refused to start "git" because TWILL_NO_EXEC is set
`;

const DUPLICATE = `
mode systems

fn sort_deps(xs: Arr[Str]) -> Arr[Str] {
  sort(xs)                     # the one-line replacement, written above
}

fn main() {
  let deps: Arr[Str] = ["weft", "bobbin", "loom"]
  for d in sort_deps(deps) { print(d) }
}

fn sort_deps(xs: Arr[Str]) -> Arr[Str] {
  let out = xs                 # the old insertion sort, still the one that runs
  out
}
`;

/* The only annotation on this page that is not the binary's own output: the two
   runs are the same command against two builds, so the block has to say which
   build gave which answer. The release half of that label is the last version
   number that was typed into this file, in a commit whose point was that no
   number here is typed in. It comes off the changelog now, like the chip and
   the figure labels, so the day this change ships the label moves with it. */
const duplicateOut = (version: string) => `
$ twill check lockfile.tw            # v${version}, the release you can download
lockfile.tw: no shape problems found

$ twill check lockfile.tw            # main
lockfile.tw:12: shape error: sort_deps is already defined on line 3; the later definition is the one that runs, so the earlier one is dead. Delete whichever is stale, or rename one.
  12 | fn sort_deps(xs: Arr[Str]) -> Arr[Str] {
`;

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

/* The language as it stands, not as a release note. The previous version of
   this section was headed "New in 1.7", which is a heading that is wrong from
   the day 1.8 ships and has to be rewritten every time. What a pattern is and
   what can be generic are facts about the language; the release they arrived in
   belongs in the release list, which is generated. */
const LANGUAGE = [
  {
    title: "A pattern is a tree",
    body: "Ok(Some(v)) takes a value apart in one place instead of a second match inside the arm; 3, \"hi\" and true match by ordinary equality, so a match over numbers needs no enum written around it; and Some(n) if n > 0 says the thing a shape cannot. A lower-case name binds rather than naming a case, so a catch-all can say what it caught.",
  },
  {
    title: "Exhaustiveness recurses",
    body: "Some(Ok(v)), Some(Err(e)) and None cover an Opt[Res[..]], and dropping one names the value that gets through rather than passing. An arm counts only when nothing but the value's shape decides whether it runs, so a guarded arm and a narrower nested one prove nothing, and Some(v) if v > 3 together with None is reported as incomplete.",
  },
  {
    title: "Anything can be generic",
    body: "struct Box[T], enum Tree[T] and fn first[T](xs: Arr[T]) -> T parse, check and run alongside the built-in Arr, Dict, Opt and Res. A Box[I64]'s field is an I64 rather than an unknown, substitution goes under the constructors a parameter is written inside, and a Box[Str] is refused where a Box[I64] was declared.",
  },
  {
    title: "And no monomorphization, which turned out not to be needed",
    body: "The original plan assumed it. The runtime is a tree walker over dynamically typed values, so the same code runs whatever T is and specialising per instantiation would produce identical copies. The parameters have to reach exactly one place, the types the checker judges against, so generics here are substitution in about eighty lines per implementation.",
  },
];

const TOOLING: [string, string][] = [
  ["twill lsp", "A language server: diagnostics republished as you type, formatting, and hover reporting the inferred type and shape. Hover is the one worth having, because in a tensor-first language the question you actually have is what shape something is, and it is answered from the checker without running anything."],
  ["std/gradcheck", "A gradient checker. There is nothing about a wrong gradient that looks wrong: the model does not crash, it trains to a worse loss, and the search starts at the learning rate. Compares against a central difference quotient, deliberately not built out of grad."],
  ["twill doctor", "Answers the question a bug report starts with, and finds what is wrong quietly: a stale binary earlier on PATH, a TWILL_STD pointing at last month's checkout, a standard library that will not load."],
  [":type and :shape", "Answer from the checker in the REPL without running anything. :shape randn(4096, 4096) @ w costs nothing here and a gigabyte there."],
  ["The filesystem, finished", "path_exists, mkdir_all, remove_all, rename, mtime, temp_dir, cwd and the seven path operations. Plus read_file_at, a ranged read: read_file returns the whole file, so a reader following a growing log read all of it again on every poll."],
  ["mono_ns()", "A clock that only goes forward. The wall clock steps when the system time is corrected, so a duration measured across one is wrong by the correction, which for a benchmark is the difference between a number and a fiction."],
];

const ECOSYSTEM = [
  { name: "twill", blurb: "The language, the Go bootstrap, and the compiler written in twill.", href: `${GH}` },
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
  "The shape checker is best-effort, not a full type system. It flags a mismatch only where one is certain: code whose shapes depend on runtime values is left alone rather than guessed at.",
  "The self-hosted compiler runs on the Go bootstrap. The Go-free binary, and the triple build that would prove it, are the stage after this one.",
];

/** `four` -> `Four`, for a count that opens a sentence or a heading. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "four in spool, three in twill itself, two in bobbin, one in loom and one in weft" */
function splitByRepo(byRepo: { repo: string; n: number }[]): string {
  const parts = byRepo.map(
    ({ repo, n }) => `${word(n)} in ${repo === "twill" ? "twill itself" : repo}`,
  );
  if (parts.length < 2) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export default async function Home() {
  const [newest, pending, all, sorts] = await Promise.all([
    latest(),
    unreleased(),
    releases(),
    handSorts(),
  ]);
  const recent = all.filter((r) => r.version).slice(0, 3);

  /* Figure A's whole argument is a count of other people's source, and it was
     typed in here: "eleven hand-written sorts ... four in spool, one in loom,
     two in bobbin, one in weft, and three in twill itself, two of which are the
     same function under the same name". The sentence cited docs/roadmap.md for
     all of it and did not read it. lib/roadmap.ts reads it now, and every number
     in the paragraph below is counted off that document's own list of sorts when
     this page is built. */
  const repeat = sorts.repeated[0];
  const sortsBody =
    `sort ordered strings and nothing else, so ${word(sorts.byRepo.length)} codebases wrote ` +
    `their own. docs/roadmap.md counts ${word(sorts.all.length)} hand-written sorts and names ` +
    `every one: ${splitByRepo(sorts.byRepo)}` +
    (repeat
      ? `; and the same function, ${repeat.fn}, is written out under the same name in ` +
        `${word(repeat.n)} files of the ${repeat.repo} repository`
      : "") +
    ". skein needed the comparison most, because it sorts an index array by comparing through a " +
    "second array the closure captures, and that was only expressible once function values landed " +
    "in 1.7. Every form is stable, which here is correctness rather than a nicety: skein assigns " +
    "token ids from a sorted vocabulary, so an unstable sort would make the ids a function of the " +
    "sort's internals rather than of the corpus.";

  // Figure C is about one specific unreleased change, so it is shown only while
  // the changelog still has that change pending. On the day it ships the figure
  // goes away on its own rather than sitting there saying "on main" about work
  // that is now in a tag, and a DIFFERENT unreleased change does not inherit a
  // figure written about this one.
  const duplicateRefusalPending = Boolean(
    pending?.entries.some((e) => /defined twice/i.test(e)),
  );

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="pb-20 pt-14 sm:pb-28 sm:pt-20">
          <Enter>
            <div className="flex flex-wrap items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/twill-mark.svg" alt="twill" width={44} height={44} />
              {/* The release strip: version, date and what the release was for,
                  all three read out of the changelog at build time. */}
              <a
                href={`${GH}/releases/tag/v${newest.version}`}
                className="release-strip min-w-0"
              >
                <span className="release-version">v{newest.version}</span>
                <span className="release-line truncate">
                  <b>{longDate(newest.date)}</b>
                  {newest.entries[0] && (
                    <span className="hidden sm:inline">: {newest.entries[0]}</span>
                  )}
                </span>
                <ArrowUpRight size={14} className="shrink-0 text-muted" />
              </a>
            </div>
          </Enter>
          <Enter delay={0.06}>
            <p className="meta-row t-eyebrow mt-4">
              <span>MIT licensed</span>
              <span className="meta-dot">Early prototype</span>
              <span className="meta-dot">One Go binary, no dependencies</span>
            </p>
          </Enter>
          <Enter delay={0.12}>
            <h1 className="t-display mt-8 max-w-[22ch] text-balance">
              A language where tensors are the primitive.
            </h1>
          </Enter>
          <Enter delay={0.18}>
            <p className="t-lead mt-6 max-w-[52ch]">
              twill is a small language where{" "}
              <code className="font-mono text-brand">grad</code> is built in and a shape
              mistake is an error you see before the program runs.
            </p>
          </Enter>
          <Enter delay={0.24}>
            <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-muted">
              Most machine-learning code is a language plus a numeric framework bolted on
              top. twill goes the other way: differentiation is a language operation rather
              than a library call, a static checker reads your shapes before anything
              executes, and the compiler is written in the language it compiles.
            </p>
          </Enter>
          <Enter delay={0.3}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/docs/tutorial/" className="cta cta-primary group">
                Start the tutorial
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href={`${GH}/releases`} className="cta cta-ghost">
                <Download size={16} />
                Download a binary
              </a>
            </div>
          </Enter>
          <Enter delay={0.36}>
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-edge px-4 py-2 font-mono text-[13px] text-muted">
              <span className="min-w-0 overflow-x-auto whitespace-pre">
                <span className="select-none text-brand">$ </span>
                {INSTALL}
              </span>
              <CopyButton text={INSTALL} label="Copy the install command" />
            </div>
          </Enter>
        </section>

        <Section
          n="01"
          eyebrow="Before anything runs"
          title="The most useful thing twill does is refuse to start"
          lead={`Change a dimension in the signature and watch the checker change its mind. The messages below are what the ${newest.version} binary prints for each of these programs, character for character, and the arithmetic deciding between them is the same one rule the checker uses: the inner dimensions of a matrix multiply have to agree.`}
        >
          <ShapeLab />
          <p className="mt-6 max-w-[70ch] text-sm leading-relaxed text-muted">
            A dimension can be a literal, or a name. A name used more than once must be the
            same size, which is what lets the checker verify the return type of{" "}
            <code className="font-mono text-brand">fn mm(A: [n, k], B: [k, m]) -&gt; [n, m]</code>.
            The checker only flags a mismatch when it is certain: code whose shapes depend
            on runtime values is left alone rather than guessed at, so a clean run means
            what it says. And a clean run exits 0, so{" "}
            <code className="font-mono text-brand">twill check</code> is a CI gate as it
            stands.
          </p>
        </Section>

        <Section
          n="02"
          eyebrow="The whole of it"
          title="Price a European call, then differentiate the pricer for its Greeks"
          lead="No bumping, no second library. grad went through 200,000 simulated paths, a relu payoff and a mean, and landed on the closed-form Greeks."
        >
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
            <Code label="examples/montecarlo_option.tw">{MONTE_CARLO}</Code>
            <Term label="output">{MONTE_CARLO_OUT}</Term>
          </div>
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
            <Term label="twill check">{UNITS_OUT}</Term>
          </div>
        </Section>

        <Section
          n="05"
          eyebrow="Self-hosting"
          title="twill is written in twill, and the claim is checked rather than asserted"
          lead="The lexer, parser, checker, evaluator, tensor kernels, formatter and CLI are written in the language itself. What makes that a claim rather than a boast is the fourth line of this chain: the same corpus goes through both implementations and the bytes are compared."
        >
          <BootstrapChain />
          <Reveal>
            {/* `.tap` on each: these are standalone links in a row, not links
                inside a sentence, so they are targets and get 44px. */}
            <div className="mt-8 flex flex-wrap gap-x-6 text-sm">
              <Link href="/docs/self-hosting/" className="tap text-link hover:underline">
                How the port works
              </Link>
              <Link href="/docs/needs/" className="tap text-link hover:underline">
                What is still missing
              </Link>
              <Link href="/docs/roadmap/" className="tap text-link hover:underline">
                The ranked roadmap
              </Link>
            </div>
          </Reveal>
        </Section>

        <Section
          n="06"
          eyebrow="What shipped"
          title="Three walls the ecosystem kept hitting"
          lead="Every entry here came from docs/roadmap.md, which ranks what the language is missing by how many of the independently written codebases hit each wall on their own. The list below is read out of the changelog when this page is built, so it is the releases the language actually has rather than the ones somebody remembered to type in."
        >
          <Reveal>
            <ol className="hairline-grid grid sm:grid-cols-3">
              {recent.map((r) => (
                <li key={r.version} className="bg-raised p-5">
                  <p className="t-eyebrow text-brand">v{r.version}</p>
                  <p className="mt-1 text-xs text-faint">{longDate(r.date)}</p>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                    {r.entries.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </Reveal>

          <Figure
            index="A"
            version={`v${newest.version}`}
            title="sort orders more than strings, and takes a comparison"
            body={sortsBody}
            source={SORT}
            sourceLabel="sort_demo.tw"
            output={SORT_OUT}
            outputLabel="twill run"
          />

          <Figure
            index="B"
            version="v1.8.0"
            title="A program can start another program, and never through a shell"
            body="run(program, argv, dir) -> Res[Str, Str]. spool needed it to fetch a package at all: the package manager for a self-hosting language could not clone a repository. The program and its arguments stay separate values all the way to execve, so an argument reaches the program as text rather than as something a shell gets to read, which matters when the arguments are tags and URLs out of a manifest a stranger wrote. Ok carries stdout and only on an exit status of 0; stderr is the Err message and is never spliced into Ok. The blank line in the output below is git's own trailing newline, which arrives in stdout whole rather than being trimmed on the way. TWILL_NO_EXEC set to anything non-empty makes every call answer Err without starting anything, and an Err rather than an abort, so a program degrades to what it can still do."
            source={RUN}
            sourceLabel="head.tw"
            output={RUN_OUT}
            outputLabel="twill run"
          />

          {duplicateRefusalPending && (
            <Figure
              index="C"
              version="on main"
              pending
              title="A function defined twice was silently the second one"
              body="This one has merged and is not in a release yet, which is why the figure runs it twice. spool replaced two of its insertion sorts by writing the new one-line versions above the old bodies, which stayed; both files kept running the insertion sort through a passing test suite, a passing source gate and passing CI. There is no conditional compilation in this language, so a second declaration of one name in one file is an edit that went wrong, and the sweep of the ecosystem's twill sources that preceded the change found no case that was not. Both checkers refuse it now, and the message names which definition runs."
              source={DUPLICATE}
              sourceLabel="lockfile.tw"
              output={duplicateOut(newest.version)}
              outputLabel="twill check, twice"
            />
          )}
        </Section>

        <Section
          n="07"
          eyebrow="The language"
          title="What a pattern is, and what can be generic"
          lead="Two things the language was missing from the middle, and both are checked by the Go bootstrap and by the compiler written in twill, which is the check this project exists to be able to make."
        >
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <Code label="expr.tw">{PATTERNS}</Code>
            <Term label="twill check">{PATTERNS_OUT}</Term>
          </div>

          <Stagger className="hairline-grid mt-8 grid sm:grid-cols-2">
            {LANGUAGE.map((c, i) => (
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
        </Section>

        <Section
          n="08"
          eyebrow="The ecosystem"
          title={`${cap(word(ECOSYSTEM.length))} repositories, ${word(ECOSYSTEM.length - 1)} of them written in twill`}
          lead="Everything downstream of the compiler is written in twill itself, which is the same experiment run again: a real program against the subset, with its own list of what is missing. Those lists are what the roadmap ranks."
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
          n="09"
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

        <Section n="10" eyebrow="Read on" title="Documentation">
          <Reveal>
            <Link href="/docs/" className="cta cta-primary group">
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
 * One release, given a figure.
 *
 * Sections 01, 02, 04 and 07 all pair source with the output it produced, which
 * is the strongest visual idea this page has; the release section used to be
 * three text cards and nothing else, so the newest work was the only work on the
 * page with no evidence attached to it.
 */
function Figure({
  index,
  version,
  title,
  body,
  source,
  sourceLabel,
  output,
  outputLabel,
  pending = false,
}: {
  index: string;
  version: string;
  title: string;
  body: string;
  source: string;
  sourceLabel: string;
  output: string;
  outputLabel: string;
  pending?: boolean;
}) {
  return (
    <Reveal>
      <div className="mt-12 border-t border-edge pt-8">
        <p className="t-eyebrow flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-brand">{index}</span>
          <span className={pending ? "text-[var(--warn)]" : "text-muted"}>{version}</span>
        </p>
        <h3 className="t-title mt-3 max-w-[26ch] text-balance">{title}</h3>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-muted">{body}</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
          <Code label={sourceLabel}>{source}</Code>
          <Term label={outputLabel}>{output}</Term>
        </div>
      </div>
    </Reveal>
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
