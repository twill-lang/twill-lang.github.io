import { Marked } from "marked";

/**
 * The docs are not kept here.
 *
 * Every page under /docs is fetched from twill-lang/twill at build time and
 * baked into static HTML. Vendoring copies instead would mean two sources of
 * truth for the same sentence, and the copy on the website is the one that
 * silently goes stale: nobody editing the language remembers to update a
 * different repository's mirror. Fetching makes drift impossible rather than
 * merely discouraged.
 *
 * The cost is that a docs build needs the network, which is why `load` throws
 * loudly rather than substituting a placeholder. A page that half-rendered
 * would publish a doc missing its middle and look fine doing it.
 */

const RAW = "https://raw.githubusercontent.com/twill-lang/twill/main/docs";
const REPO = "https://github.com/twill-lang/twill/blob/main/docs";

export type Doc = {
  /** URL segment under /docs. */
  slug: string;
  /** Source file in the twill repo. */
  file: string;
  title: string;
  blurb: string;
  section: "Start here" | "Reference" | "Under the hood" | "Evidence";
};

/**
 * Curated, not a directory listing. The twill repo's docs folder also holds
 * working notes (bug lists, rewrite plans, perf scratch) that are useful next
 * to the code and confusing on a website.
 */
export const DOCS: Doc[] = [
  { slug: "tutorial", file: "tutorial.md", section: "Start here", title: "Tutorial", blurb: "From nothing to a trained model." },
  { slug: "language-guide", file: "language-guide.md", section: "Start here", title: "Language guide", blurb: "The reference: syntax, tensors, shapes, units, the builtins." },
  { slug: "exercises", file: "EXERCISES.md", section: "Start here", title: "Exercises", blurb: "Problems to work through, with answers in the repo." },

  { slug: "type-system", file: "type-system.md", section: "Reference", title: "Type system", blurb: "How shapes, units and records are checked before anything runs." },
  { slug: "dtypes", file: "dtypes.md", section: "Reference", title: "Data types", blurb: "The numeric tower, and what each type costs." },
  { slug: "cli", file: "cli-design.md", section: "Reference", title: "The CLI", blurb: "run, check, fmt, test, repl, and why they are shaped that way." },

  { slug: "design", file: "design.md", section: "Under the hood", title: "Design notes", blurb: "Why it is built this way, and the roadmap." },
  { slug: "self-hosting", file: "self-hosting.md", section: "Under the hood", title: "Self-hosting", blurb: "The systems subset, and the compiler written in twill." },
  { slug: "needs", file: "needs.md", section: "Under the hood", title: "What the language still needs", blurb: "The work queue, one numbered entry per missing feature." },
  { slug: "decisions", file: "DECISIONS.md", section: "Under the hood", title: "Decisions", blurb: "The calls that were made, and what they cost." },
  { slug: "gpu", file: "gpu-feasibility.md", section: "Under the hood", title: "GPU feasibility", blurb: "What a GPU backend would actually buy, measured." },

  { slug: "correctness", file: "CORRECTNESS.md", section: "Evidence", title: "Correctness", blurb: "The evidence for grad and for the checker." },
  { slug: "benchmarks", file: "BENCHMARKS.md", section: "Evidence", title: "Benchmarks", blurb: "How fast it is, where the time goes, and PyTorch on the same mathematics." },
  { slug: "finance", file: "finance.md", section: "Under the hood", title: "Financial ML", blurb: "Where twill aims to beat a Python stack, assessed honestly." },
];

export const SECTIONS = ["Start here", "Reference", "Under the hood", "Evidence"] as const;

export function findDoc(slug: string): Doc | undefined {
  return DOCS.find((d) => d.slug === slug);
}

/** Heading text -> the id `marked` will have given it, for the on-page contents. */
export type Heading = { level: 2 | 3; text: string; id: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Rewrite the links a doc makes to its neighbours.
 *
 * Inside the repo `[design](design.md)` resolves against the docs folder. On
 * the site the same link has to point at /docs/design/ when that doc is
 * published here, and at GitHub when it is not, because the curated list above
 * deliberately omits some of what the docs cross-reference. Left alone these
 * become 404s on a relative path that means nothing to a browser.
 */
function rewriteLinks(html: string): string {
  return html.replace(/href="(?!https?:|#|\/)([^"]+)"/g, (whole, href: string) => {
    const [path, hash = ""] = href.split("#");
    const file = path.replace(/^\.\//, "");
    const published = DOCS.find((d) => d.file === file);
    if (published) return `href="/docs/${published.slug}/${hash ? "#" + hash : ""}"`;
    // Anything else is a path relative to the docs folder or the repo root;
    // send it to GitHub, where it certainly resolves.
    const up = file.startsWith("../");
    const base = up
      ? "https://github.com/twill-lang/twill/blob/main"
      : REPO;
    return `href="${base}/${file.replace(/^\.\.\//, "")}${hash ? "#" + hash : ""}"`;
  });
}

/**
 * Headings carry ids so the contents rail can link to them. marked does not
 * emit ids of its own, and the id has to be produced by the same `slugify` the
 * contents uses or every link in the rail lands nowhere.
 */
const md = new Marked({ gfm: true, breaks: false });
md.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const id = slugify(text.replace(/<[^>]+>/g, ""));
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
  },
});

export type LoadedDoc = { html: string; headings: Heading[] };

/** Fetch one doc and render it. Throws rather than publishing a partial page. */
export async function load(doc: Doc): Promise<LoadedDoc> {
  const res = await fetch(`${RAW}/${doc.file}`, {
    headers: { "User-Agent": "twill-lang.github.io build" },
  });
  if (!res.ok) {
    throw new Error(`docs: ${doc.file} fetched ${res.status} from ${RAW}`);
  }
  const source = await res.text();

  const headings: Heading[] = [];
  for (const m of source.matchAll(/^(#{2,3})\s+(.+?)\s*$/gm)) {
    const level = m[1].length as 2 | 3;
    // Strip inline code ticks and links so the contents reads as words.
    const text = m[2].replace(/`/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
    headings.push({ level, text, id: slugify(text) });
  }

  const html = await md.parse(source);
  return { html: rewriteLinks(html), headings };
}
