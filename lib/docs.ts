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
 *
 * roadmap.md is published now, and it is the reason to say what the rule is:
 * the list omits notes that need the source tree beside them to make sense, not
 * notes that are unfinished. roadmap.md is what the home page cites when it says
 * a feature was ranked by how many independently written codebases hit the same
 * wall, and citing a document the reader cannot open is worse than publishing a
 * working note.
 */
export const DOCS: Doc[] = [
  { slug: "tutorial", file: "tutorial.md", section: "Start here", title: "Tutorial", blurb: "From nothing to a trained model." },
  { slug: "tutorial-systems", file: "tutorial-systems.md", section: "Start here", title: "The systems half", blurb: "The other half of the language: machine words, mutation, and the mode line that opts in." },
  { slug: "language-guide", file: "language-guide.md", section: "Start here", title: "Language guide", blurb: "The reference: syntax, tensors, shapes, units, the builtins." },
  { slug: "exercises", file: "EXERCISES.md", section: "Start here", title: "Exercises", blurb: "Problems to work through, with answers in the repo." },

  { slug: "type-system", file: "type-system.md", section: "Reference", title: "Type system", blurb: "How shapes, units and records are checked before anything runs." },
  { slug: "dtypes", file: "dtypes.md", section: "Reference", title: "Data types", blurb: "The numeric tower, and what each type costs." },
  { slug: "cli", file: "cli-design.md", section: "Reference", title: "The CLI", blurb: "run, check, fmt, test, repl, and why they are shaped that way." },

  { slug: "design", file: "design.md", section: "Under the hood", title: "Design notes", blurb: "Why it is built this way, and the roadmap." },
  { slug: "self-hosting", file: "self-hosting.md", section: "Under the hood", title: "Self-hosting", blurb: "The systems subset, and the compiler written in twill." },
  { slug: "needs", file: "needs.md", section: "Under the hood", title: "What the language still needs", blurb: "The work queue, one numbered entry per missing feature." },
  { slug: "roadmap", file: "roadmap.md", section: "Under the hood", title: "Roadmap", blurb: "The open features, ranked by how many independently written codebases hit each wall." },
  { slug: "decisions", file: "DECISIONS.md", section: "Under the hood", title: "Decisions", blurb: "The calls that were made, and what they cost." },
  { slug: "gpu", file: "gpu-feasibility.md", section: "Under the hood", title: "GPU feasibility", blurb: "What a GPU backend would actually buy, measured." },
  { slug: "finance", file: "finance.md", section: "Under the hood", title: "Financial ML", blurb: "Where twill aims to beat a Python stack, assessed honestly." },

  { slug: "correctness", file: "CORRECTNESS.md", section: "Evidence", title: "Correctness", blurb: "The evidence for grad and for the checker." },
  { slug: "benchmarks", file: "BENCHMARKS.md", section: "Evidence", title: "Benchmarks", blurb: "How fast it is, where the time goes, and PyTorch on the same mathematics." },
];

export const SECTIONS = ["Start here", "Reference", "Under the hood", "Evidence"] as const;

export function findDoc(slug: string): Doc | undefined {
  return DOCS.find((d) => d.slug === slug);
}

/** Heading text -> the id the rendered heading carries, for the on-page contents. */
export type Heading = { level: 2 | 3; text: string; id: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** A heading as words: no backticks, no link syntax, no emphasis markers. */
function headingText(markdown: string): string {
  return markdown
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();
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
 * Blank out fenced code blocks, keeping the line count.
 *
 * A `## something` inside a fence is a shell comment or a markdown sample, not a
 * heading, and the contents rail used to list every one of them as an entry that
 * linked nowhere. The docs are full of both: `docs/cli-design.md` alone has
 * several. Replacing the fence with blank lines rather than deleting it keeps
 * every other line where it was.
 */
function withoutFences(source: string): string {
  let fenced = false;
  return source
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced;
        return "";
      }
      return fenced ? "" : line;
    })
    .join("\n");
}

type Scanned = { level: number; text: string; id: string };

/**
 * Every heading in the document, in order, with the id it will carry.
 *
 * ONE pass produces the ids, and both the rendered HTML and the contents rail
 * consume it, because the previous arrangement computed them twice from two
 * different strings. `lib/docs.ts` slugified the raw markdown; the marked
 * renderer slugified the inline HTML marked had already produced, with the tags
 * stripped. For a heading holding an entity, or a quote that gfm turns into a
 * curly one, those two are different strings and the rail entry pointed at an id
 * no element had. Deriving one list and handing it out makes divergence
 * impossible rather than unlikely.
 *
 * The counter is the other half of it: two headings with the same words are
 * common in a long document (`### Genuine` under two sections), and one id for
 * both sends every link to the first.
 */
function scanHeadings(source: string): Scanned[] {
  const seen = new Map<string, number>();
  const out: Scanned[] = [];
  for (const m of withoutFences(source).matchAll(/^(#{1,6})\s+(.+?)\s*$/gm)) {
    const text = headingText(m[2]);
    const base = slugify(text) || "section";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({ level: m[1].length, text, id: n === 1 ? base : `${base}-${n}` });
  }
  return out;
}

export type LoadedDoc = { html: string; headings: Heading[] };

const cache = new Map<string, LoadedDoc>();

/**
 * Fetch one doc and render it. Throws rather than publishing a partial page.
 *
 * Memoised: a static export renders the doc index, the doc page and the search
 * index in separate passes, and refetching the same file from raw.github for
 * each of them is the fastest way to be rate limited on a shared runner.
 */
export async function load(doc: Doc): Promise<LoadedDoc> {
  const hit = cache.get(doc.slug);
  if (hit) return hit;

  const res = await fetch(`${RAW}/${doc.file}`, {
    headers: { "User-Agent": "twill-lang.github.io build" },
  });
  if (!res.ok) {
    throw new Error(`docs: ${doc.file} fetched ${res.status} from ${RAW}`);
  }
  const source = await res.text();

  const scanned = scanHeadings(source);
  const ids = scanned.map((h) => h.id);

  // A parser per document, because the renderer below consumes the id list in
  // document order and a shared instance would carry one document's cursor into
  // the next one.
  let cursor = 0;
  const md = new Marked({ gfm: true, breaks: false });
  md.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const id = ids[cursor++] ?? "";
        return `<h${depth}${id ? ` id="${id}"` : ""}>${html}</h${depth}>\n`;
      },
    },
  });

  const headings: Heading[] = scanned
    .filter((h): h is Scanned & { level: 2 | 3 } => h.level === 2 || h.level === 3)
    .map(({ level, text, id }) => ({ level, text, id }));

  const html = rewriteLinks(await md.parse(source));
  const loaded: LoadedDoc = { html, headings };
  cache.set(doc.slug, loaded);
  return loaded;
}

/** One searchable destination: a doc, or a heading inside one. */
export type SearchEntry = {
  /** Doc title, always. */
  doc: string;
  /** Heading text, when this entry is a heading rather than the doc itself. */
  heading?: string;
  href: string;
};

/**
 * The whole site's docs, flattened into something a phone can search.
 *
 * Fourteen thousand words of reference with no way to find a builtin by name was
 * the other half of the mobile navigation problem: below 1024px there is no
 * rail, so search is not a convenience there, it is the navigation.
 *
 * Only h2 headings, deliberately. Every heading of every level is roughly four
 * times the bytes for entries that mostly repeat their parent's words, and this
 * index is inlined into each docs page rather than fetched, so its size is paid
 * on every one of them.
 */
export async function searchIndex(): Promise<SearchEntry[]> {
  const out: SearchEntry[] = [];
  for (const doc of DOCS) {
    out.push({ doc: doc.title, href: `/docs/${doc.slug}/` });
    const { headings } = await load(doc);
    for (const h of headings) {
      if (h.level !== 2) continue;
      out.push({ doc: doc.title, heading: h.text, href: `/docs/${doc.slug}/#${h.id}` });
    }
  }
  return out;
}
