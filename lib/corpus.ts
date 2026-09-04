/**
 * The corpus sizes, counted out of the twill repository when this page is built.
 *
 * WHY THIS FILE EXISTS. The bootstrap chain is the strongest claim on the site,
 * and it carried three numbers typed into the component by hand: "443 corpus
 * files", "fmt on all 89 it formats", "a 461-file corpus test". All three were
 * lifted from the v1.4.0 changelog entry, dated 11 August 2026, and presented as
 * the state of things today. Today the differential corpus is a different size
 * and so is the formatter's. A number that was true of a release a month ago and
 * is shown as current is the one kind of claim a language whose pitch is "the
 * checker refuses before anything runs" cannot make about itself.
 *
 * So nothing is typed in. Two things are read from twill-lang/twill at build
 * time, and the second is read through the first:
 *
 *   1. The DEFINITION of each corpus, from the source that defines it. The
 *      differential runner's default corpus directory comes out of the flag
 *      declaration in `tools/diff/run/main.go`; the formatter corpus's file
 *      globs come out of `corpusFiles` in `internal/format/corpus_test.go`.
 *   2. The FILES, from the repository's git tree, filtered by those definitions.
 *
 * Reading the definition rather than restating it is the point. If someone adds
 * `bench/workloads` to the formatter corpus, this counts it on the next build.
 * If someone renames the corpus directory, the parse fails and the build stops,
 * which is the failure the old hand-typed numbers could not have.
 *
 * Failure posture is the same as lib/docs.ts and lib/releases.ts: anything that
 * does not come back the way it is expected throws and fails the build. A
 * website that guesses at this number is worse than a website that is down.
 */

const API = "https://api.github.com/repos/twill-lang/twill";
const RAW = "https://raw.githubusercontent.com/twill-lang/twill/main";

/** The branch every other fetch in this site reads from. */
const REF = "main";

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent": "twill-lang.github.io build",
    Accept: "application/vnd.github+json",
  };
  // Unauthenticated api.github.com is sixty requests an hour per IP, which a
  // shared CI runner can exhaust without this build having done anything. The
  // workflows pass the token they already have.
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function text(url: string): Promise<string> {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`corpus: ${url} fetched ${res.status}`);
  return res.text();
}

let treeCache: string[] | null = null;

/** Every file path in the repository at `main`. */
async function paths(): Promise<string[]> {
  if (treeCache) return treeCache;

  const res = await fetch(`${API}/git/trees/${REF}?recursive=1`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`corpus: git tree fetched ${res.status} from ${API}`);
  }
  const body = (await res.json()) as {
    truncated?: boolean;
    tree?: { path: string; type: string }[];
  };

  // GitHub truncates a tree it considers too large, silently, by setting a flag
  // and returning a prefix. Counting a prefix would produce a number that is
  // wrong in the safe-looking direction, so it is refused rather than used.
  if (body.truncated) {
    throw new Error("corpus: the git tree came back truncated, so a count would be short");
  }
  const tree = body.tree;
  if (!tree || tree.length === 0) {
    throw new Error("corpus: the git tree came back empty");
  }

  treeCache = tree.filter((e) => e.type === "blob").map((e) => e.path);
  return treeCache;
}

/**
 * `dir/*.tw`, matched the way `filepath.Glob` matches it: one directory level,
 * no recursion. `testdata/cases/*.tw` is not `testdata/cases/nested/x.tw`.
 */
function matchesGlob(path: string, dir: string): boolean {
  if (!path.endsWith(".tw")) return false;
  const at = path.lastIndexOf("/");
  return at > 0 && path.slice(0, at) === dir;
}

/**
 * The directory `tools/diff/run` walks by default, out of its own flag.
 *
 * The declaration reads:
 *   corpus = flag.String("corpus", "testdata", "corpus directory holding ...")
 */
async function differentialRoot(): Promise<string> {
  const src = await text(`${RAW}/tools/diff/run/main.go`);
  const m = /flag\.String\(\s*"corpus"\s*,\s*"([^"]+)"/.exec(src);
  if (!m) {
    throw new Error("corpus: no `corpus` flag default in tools/diff/run/main.go");
  }
  return m[1].replace(/\/+$/, "");
}

/**
 * The globs `internal/format/corpus_test.go` holds the formatter to.
 *
 * They are written as `filepath.Join("..", "..", "testdata", "cases", "*.tw")`,
 * relative to the test's own package directory, so the two leading `..`
 * segments are what makes each one a path from the repository root.
 */
async function formatterGlobs(): Promise<string[]> {
  const src = await text(`${RAW}/internal/format/corpus_test.go`);
  const fn = /func corpusFiles\([\s\S]*?\n}/.exec(src);
  if (!fn) {
    throw new Error("corpus: no corpusFiles function in internal/format/corpus_test.go");
  }

  const dirs: string[] = [];
  for (const call of fn[0].matchAll(/filepath\.Join\(([^)]*)\)/g)) {
    const parts = Array.from(call[1].matchAll(/"([^"]*)"/g)).map((p) => p[1]);
    if (parts.length === 0 || !parts[parts.length - 1].endsWith(".tw")) continue;
    // Drop the trailing `*.tw` and the `..` that climb out of the package.
    const dir = parts.slice(0, -1).filter((p) => p !== "..");
    if (dir.length === 0) continue;
    dirs.push(dir.join("/"));
  }
  if (dirs.length === 0) {
    throw new Error("corpus: corpusFiles named no .tw globs");
  }
  return dirs;
}

export type Corpus = {
  /** Every .tw file under the differential runner's corpus directory. */
  differential: number;
  /** The directory that count is of, for the sentence that quotes it. */
  differentialRoot: string;
  /** Every .tw file the formatter corpus test globs. */
  formatter: number;
};

let cached: Corpus | null = null;

/** Memoised: a static export renders more than one page off the same figure. */
export async function corpus(): Promise<Corpus> {
  if (cached) return cached;

  const [files, root, globs] = await Promise.all([paths(), differentialRoot(), formatterGlobs()]);

  const prefix = `${root}/`;
  const differential = files.filter((p) => p.endsWith(".tw") && p.startsWith(prefix)).length;

  // A file reachable through two globs is one file. The formatter test globs do
  // not overlap today, and a set costs nothing to be sure of it.
  const formatted = new Set<string>();
  for (const dir of globs) {
    for (const p of files) if (matchesGlob(p, dir)) formatted.add(p);
  }

  if (differential === 0 || formatted.size === 0) {
    throw new Error(
      `corpus: counted ${differential} differential and ${formatted.size} formatter files, ` +
        "so the definitions no longer match the tree",
    );
  }

  cached = { differential, differentialRoot: root, formatter: formatted.size };
  return cached;
}
