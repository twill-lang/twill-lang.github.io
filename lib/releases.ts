/**
 * The releases, read from the changelog rather than typed in here.
 *
 * The whole class of bug this replaces: the version chip, the "new in X"
 * heading and the list of what shipped were three hand-copied constants in
 * app/page.tsx, and every one of them had to be remembered on release day. They
 * were not, which is how a site for a language on 1.9.0 spent a month saying
 * 1.7 in one place and 1.9 in another.
 *
 * So the same build-time fetch lib/docs.ts already runs for the docs also reads
 * CHANGELOG.md and parses it. Adding a release to the language now adds it to
 * the site, and nothing here needs editing. Same failure posture as the docs: a
 * fetch that does not return 200, or a changelog this cannot find a release in,
 * throws and fails the build rather than publishing a page that quietly claims
 * an old version.
 */

const RAW = "https://raw.githubusercontent.com/twill-lang/twill/main/CHANGELOG.md";

export type Release = {
  /** "1.9.0", or null for the unreleased section at the top. */
  version: string | null;
  /** ISO date from the heading, absent for unreleased work. */
  date: string | null;
  /** The paragraph under the heading, if the entry opens with one. */
  summary: string;
  /** The bold lead of each entry under it, in order, as plain text. */
  entries: string[];
};

/** `## [1.9.0] - 2026-09-03` and `## [Unreleased]`. */
const HEADING = /^## \[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?\s*$/;

/**
 * The bold lead of a top-level bullet: `- **`sort` orders more than strings.**`.
 * Leads wrap across lines in the source, so the body is joined before matching
 * and the `[\s\S]` is deliberate.
 */
const ENTRY = /^- \*\*([\s\S]+?)\*\*/;

/**
 * Markdown to something that can sit in a sentence: ticks, links, emphasis.
 *
 * The changelog writes ` -- ` where prose would use a dash, which is a
 * repository convention rather than a typo, so it is turned into a comma here
 * instead of being passed through as two hyphens in the middle of a sentence.
 */
function plain(md: string): string {
  return md
    .replace(/\s*\n\s*/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/ -- /g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split the file into `## [...]` blocks, in the order the changelog has them. */
function sections(source: string): { version: string | null; date: string | null; body: string }[] {
  const lines = source.split("\n");
  const out: { version: string | null; date: string | null; body: string }[] = [];
  let current: { version: string | null; date: string | null; body: string[] } | null = null;

  for (const line of lines) {
    const m = HEADING.exec(line);
    if (m) {
      if (current) out.push({ ...current, body: current.body.join("\n") });
      const raw = m[1].trim();
      current = {
        version: /^\d/.test(raw) ? raw : null,
        date: m[2] ?? null,
        body: [],
      };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) out.push({ ...current, body: current.body.join("\n") });
  return out;
}

function parseBody(body: string): { summary: string; entries: string[] } {
  // Everything before the first `###` is the release's own paragraph, when it
  // has one. `[Unreleased]` usually goes straight to a `### Changed`.
  const [prose] = body.split(/^### /m);
  const summary = plain(prose.trim().split(/\n{2,}/)[0] ?? "");

  const entries: string[] = [];
  // Bullets start at column 0 and run until the next one or the next heading,
  // so a nested list inside an entry does not read as another entry.
  for (const chunk of body.split(/\n(?=- \*\*)/)) {
    const m = ENTRY.exec(chunk.trim());
    if (m) entries.push(plain(m[1]).replace(/\.$/, ""));
  }
  return { summary, entries };
}

let cached: Release[] | null = null;

/**
 * Every release in the changelog, newest first, with the unreleased section (if
 * the changelog has one) at index 0 carrying a null version.
 *
 * Memoised because a static export renders more than one page and there is no
 * reason to fetch the same file per route.
 */
export async function releases(): Promise<Release[]> {
  if (cached) return cached;

  const res = await fetch(RAW, { headers: { "User-Agent": "twill-lang.github.io build" } });
  if (!res.ok) {
    throw new Error(`releases: CHANGELOG.md fetched ${res.status} from ${RAW}`);
  }
  const source = await res.text();

  const parsed = sections(source).map(({ version, date, body }) => ({
    version,
    date,
    ...parseBody(body),
  }));

  if (!parsed.some((r) => r.version)) {
    throw new Error("releases: no `## [x.y.z]` heading in CHANGELOG.md");
  }
  cached = parsed;
  return parsed;
}

/**
 * The newest tagged release. What the version chip says, and what a visitor can
 * download.
 *
 * Typed with a non-null version, because that is what "tagged" means and
 * because the page now interpolates this number into prose and into a terminal
 * annotation rather than only into a chip. `releases()` has already thrown if
 * the changelog held no tagged release, so the find below cannot miss.
 */
export type Tagged = Release & { version: string };

export async function latest(): Promise<Tagged> {
  const all = await releases();
  return all.find((r): r is Tagged => r.version !== null)!;
}

/** Work merged since the last tag, or null when the changelog has none pending. */
export async function unreleased(): Promise<Release | null> {
  const all = await releases();
  const head = all[0];
  return head && !head.version && head.entries.length ? head : null;
}

/** `2026-09-03` -> `3 September 2026`. Written out because the site has no date library. */
export function longDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  if (!y || !m || !d || !months[m - 1]) return iso;
  return `${d} ${months[m - 1]} ${y}`;
}
