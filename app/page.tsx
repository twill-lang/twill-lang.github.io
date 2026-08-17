import Link from "next/link";
import { Code, Term } from "@/components/code";
import { Enter, Reveal } from "@/components/motion";
import { Footer, Nav } from "@/components/chrome";

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

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-5">
        {/* Hero */}
        <section className="py-20 sm:py-28">
          <Enter>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/twill-mark.svg"
              alt="twill"
              width={72}
              height={72}
              className="mb-8"
            />
          </Enter>
          <Enter delay={0.08}>
            <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-5xl">
              A small language where tensors are the primitive,{" "}
              <code className="font-mono text-teal">grad</code> is built in, and a shape
              mistake is an error you see before the program runs.
            </h1>
          </Enter>
          <Enter delay={0.16}>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
              Most machine-learning code is a language plus a numeric framework bolted on
              top. twill goes the other way: differentiation is a language operation rather
              than a library call, and a static checker reads your shapes before anything
              executes.
            </p>
          </Enter>
          <Enter delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/docs/tutorial/"
                className="rounded-lg bg-teal px-5 py-2.5 text-sm font-medium text-[#06201a] transition-transform hover:scale-[1.02] active:scale-[0.99]"
              >
                Start the tutorial
              </Link>
              <a
                href={`${GH}/releases`}
                className="rounded-lg border border-edge px-5 py-2.5 text-sm font-medium transition-colors hover:border-teal"
              >
                Download a binary
              </a>
              <code className="rounded-lg border border-edge px-4 py-2.5 font-mono text-[13px] text-muted">
                go install github.com/twill-lang/twill/cmd/twill@latest
              </code>
            </div>
          </Enter>
        </section>

        {/* The Monte Carlo example */}
        <Section
          eyebrow="The whole of it"
          title="Price a European call, then differentiate the pricer for its Greeks"
          lead="No bumping, no second library. grad went through 200,000 simulated paths, a relu payoff and a mean, and landed on the closed-form Greeks."
        >
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
            <Code>{MONTE_CARLO}</Code>
            <Term>{MONTE_CARLO_OUT}</Term>
          </div>
        </Section>

        {/* Shape errors */}
        <Section
          eyebrow="Before anything runs"
          title="The most useful thing twill does is refuse to start"
          lead="twill check infers tensor shapes across the whole program and reports the ones that cannot line up. Parameters can carry shape annotations, which turn a contract into something the checker enforces at every call site."
        >
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <Code>{SHAPE_SIG}</Code>
            <Term>{SHAPE_OUT}</Term>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted">
            A dimension can be a literal, or a name. A name used more than once must be the
            same size, which is what lets the checker verify the return type of{" "}
            <code className="font-mono text-teal">fn mm(A: [n, k], B: [k, m]) -&gt; [n, m]</code>.
            The checker only flags a mismatch when it is certain: code whose shapes depend
            on runtime values is left alone rather than guessed at, so a clean run means
            what it says.
          </p>
        </Section>

        {/* Three pillars */}
        <Section eyebrow="Why" title="Three things fall out of building the language around it">
          <div className="grid gap-4 sm:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="h-full rounded-xl border border-edge bg-raised p-5">
                  <h3 className="font-mono text-sm font-semibold text-teal">{p.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Units */}
        <Section
          eyebrow="Units of measure"
          title="Price times quantity is money; dollars plus shares is refused"
          lead="Declare base units, annotate quantities, and the checker tracks units through arithmetic. Units are erased at runtime and cost nothing."
        >
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <Code>{UNITS}</Code>
            <Term>{`$ twill check bad.tw\nbad.tw:6: shape error: unit mismatch: USD*share^-1 + share\n  6 | let bad = price + qty`}</Term>
          </div>
        </Section>

        {/* Self hosting */}
        <Section eyebrow="Self-hosting" title="twill is being written in twill">
          <Reveal>
            <div className="rounded-xl border border-teal/40 bg-raised p-6">
              <p className="text-sm leading-relaxed text-muted">
                As of v1.5.0 this runs. The lexer, parser, checker, evaluator, tensor
                kernels, formatter and CLI are written in the language itself, and the whole
                tree executes on the Go bootstrap and reproduces the reference across every
                stage: <code className="font-mono text-teal">twill check</code> matched the
                Go command byte for byte on every corpus file, and{" "}
                <code className="font-mono text-teal">twill fmt</code> on every one it
                formats.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Designing the subset a compiler needs was the point of doing it. Writing the
                compiler first is how you find out what the subset has to be, instead of
                guessing. It has already produced a numbered work queue of what the language
                still needs, and a real bug in the reference lexer.
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm">
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

        {/* Ecosystem */}
        <Section
          eyebrow="The ecosystem"
          title="Ten repositories, one language"
          lead="Everything downstream of the compiler is written in twill itself, which is the same experiment run again: a real program against the subset, with its own list of what is missing."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {ECOSYSTEM.map((r, i) => (
              <Reveal key={r.name} delay={Math.min(i, 5) * 0.05}>
                <a
                  href={r.href}
                  className="group flex h-full flex-col rounded-xl border border-edge bg-raised p-4 transition-colors hover:border-teal"
                >
                  <span className="font-mono text-sm font-semibold text-teal">{r.name}</span>
                  <span className="mt-1.5 text-sm leading-relaxed text-muted">{r.blurb}</span>
                </a>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Honesty */}
        <Section eyebrow="What is not done yet" title="This is a prototype, and some of it is deliberately left for later">
          <Reveal>
            <ul className="grid gap-2.5 text-sm leading-relaxed text-muted sm:grid-cols-2">
              {[
                "It is interpreted. Tensor ops loop in Go, and there is no vectorized or GPU backend.",
                "Autodiff is reverse-mode and first-order. grad(grad(f)) is refused rather than silently answered with zero.",
                "The shape checker is best-effort, not a full type system.",
                "The self-hosted compiler runs on the Go bootstrap, not yet as its own Go-free binary.",
              ].map((t) => (
                <li key={t} className="rounded-lg border border-edge bg-raised px-4 py-3">
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </Section>

        <Section eyebrow="Read on" title="Documentation">
          <Reveal>
            <Link
              href="/docs/"
              className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-medium text-[#06201a] transition-transform hover:scale-[1.02]"
            >
              Browse the docs
            </Link>
          </Reveal>
        </Section>
      </main>
      <Footer />
    </>
  );
}

function Section({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-edge py-16 sm:py-20">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-widest text-teal">{eyebrow}</p>
        <h2 className="mt-3 max-w-3xl text-balance text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {lead && (
          <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
            {lead}
          </p>
        )}
      </Reveal>
      <div className="mt-8">{children}</div>
    </section>
  );
}
