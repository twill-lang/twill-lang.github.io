/**
 * The hand-written sorts, counted out of docs/roadmap.md at build time.
 *
 * The home page's strongest argument for `sort_by` is the count of the sorts it
 * deletes, and that count was typed into app/page.tsx: "eleven hand-written
 * sorts ... four in spool, one in loom, two in bobbin, one in weft, and three in
 * twill itself, two of which are the same function under the same name in two
 * files". Every one of those numbers is a fact about other people's source that
 * changes without anyone touching this repository, and the sentence cited a
 * document for them while not reading it.
 *
 * It reads it now. roadmap.md names each sort as a bullet with its file and
 * line, and this parses that list: the total, the split by repository, and the
 * duplicates, which is the detail the roadmap calls the point. Change the list
 * upstream and the sentence changes on the next build; break the list's shape
 * and the build stops rather than printing a stale number.
 */

const RAW = "https://raw.githubusercontent.com/twill-lang/twill/main/docs/roadmap.md";

/** One entry of the roadmap's list: where the sort is, and what it is called. */
export type HandSort = { repo: string; file: string; fn: string };

export type Sorts = {
  all: HandSort[];
  /** Repositories in descending count, so the sentence reads worst first. */
  byRepo: { repo: string; n: number }[];
  /**
   * Repositories holding the same function name more than once, most repeats
   * first. The order is stated rather than inherited: see `handSorts`.
   */
  repeated: { repo: string; fn: string; n: number }[];
};

/** The heading of the list, as the roadmap writes it. */
const LIST_LEAD = /hand-written insertion sorts[^\n]*:\s*\n/i;

/**
 * A bullet is one of two shapes, and both appear in the list:
 *
 *   - `spool/src/strutil.tw:301` `sort_strs`
 *   - twill `src/check.tw:254` `sort_strings`
 *
 * The second is how the roadmap writes its own repository, so the repository
 * name is outside the backticks there. Taking the name from before the tick when
 * the path has no repository segment of its own covers both without guessing.
 */
const BULLET = /^- (?:([A-Za-z][\w-]*)\s+)?`([^`]+)`\s+`([^`]+)`/;

function parse(source: string): HandSort[] {
  const lead = LIST_LEAD.exec(source);
  if (!lead) {
    throw new Error("roadmap: no `hand-written insertion sorts ... :` list in roadmap.md");
  }

  const out: HandSort[] = [];
  for (const line of source.slice(lead.index + lead[0].length).split("\n")) {
    if (line.trim() === "") {
      // A blank line inside the list would end it early, so only stop once
      // something has been collected.
      if (out.length > 0) break;
      continue;
    }
    const m = BULLET.exec(line.trim());
    if (!m) break;
    const [, prefix, path, fn] = m;
    // `spool/src/strutil.tw:301` carries its repository; `src/check.tw:254`
    // does not, and the word before it is the repository.
    const segments = path.split("/");
    const owned = segments.length > 1 && segments[0] !== "src" && segments[0] !== "std";
    const repo = owned ? segments[0] : prefix;
    if (!repo) {
      throw new Error(`roadmap: cannot tell which repository holds ${path}`);
    }
    out.push({ repo, file: owned ? segments.slice(1).join("/") : path, fn });
  }

  if (out.length < 2) {
    throw new Error(`roadmap: parsed ${out.length} sorts, so the list is not being read`);
  }
  return out;
}

let cached: Sorts | null = null;

export async function handSorts(): Promise<Sorts> {
  if (cached) return cached;

  const res = await fetch(RAW, {
    headers: { "User-Agent": "twill-lang.github.io build" },
  });
  if (!res.ok) throw new Error(`roadmap: roadmap.md fetched ${res.status} from ${RAW}`);
  const all = parse(await res.text());

  const counts = new Map<string, number>();
  for (const s of all) counts.set(s.repo, (counts.get(s.repo) ?? 0) + 1);
  const byRepo = [...counts]
    .map(([repo, n]) => ({ repo, n }))
    .sort((a, b) => b.n - a.n || a.repo.localeCompare(b.repo));

  // Repository and function name are counted as a pair through a nested map
  // rather than through one joined string key. Joining them needs a separator
  // that can occur in neither half, and the first version of this used a
  // literal NUL byte for it. That is correct arithmetic and was a mistake for a
  // different reason: a NUL in the source makes git classify this file as
  // binary, so the GitHub API serves no patch for it and every line of this
  // parser arrives in a pull request unreadable, unblameable and invisible to
  // git grep. Nesting the map needs no separator at all.
  const pairs = new Map<string, Map<string, number>>();
  for (const s of all) {
    let fns = pairs.get(s.repo);
    if (!fns) pairs.set(s.repo, (fns = new Map()));
    fns.set(s.fn, (fns.get(s.fn) ?? 0) + 1);
  }
  const repeated = [...pairs]
    .flatMap(([repo, fns]) => [...fns].filter(([, n]) => n > 1).map(([fn, n]) => ({ repo, fn, n })))
    // Sorted, and this is not a nicety. Map iteration is insertion order, so a
    // nested map walks repository-then-function while the flat map it replaced
    // walked pair-first: on a list that interleaves repositories they come out
    // in different orders, and app/page.tsx names `repeated[0]` in a sentence.
    // Today's roadmap has one duplicate and cannot tell the difference, which
    // is exactly the kind of agreement that stops holding on somebody else's
    // commit. Ordering it here means the sentence picks the biggest duplicate
    // because that is what it asked for, rather than because of which map the
    // count happened to be kept in.
    .sort((a, b) => b.n - a.n || a.repo.localeCompare(b.repo) || a.fn.localeCompare(b.fn));

  cached = { all, byRepo, repeated };
  return cached;
}

const WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

/** Small counts in prose read as words. Past twenty, digits are the lesser evil. */
export function word(n: number): string {
  return WORDS[n] ?? String(n);
}
