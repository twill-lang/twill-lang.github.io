/**
 * Walk every element of every built page and report the ones at opacity 0.
 *
 * WHY THIS EXISTS. Twice now this site has shipped a change whose defence was an
 * adjective. "Nothing is hidden at rest" was written in a pull request body while
 * ten elements of the home page, including the shape error message that is the
 * page's whole argument, sat at opacity 0 permanently in any browser that never
 * delivered an animation frame. An adjective cannot be re-run. This can, and it
 * prints a number for every page rather than a claim about the site.
 *
 * THE CONDITION. A browser that never paints is not a browser with animation
 * turned off. It is a browser where:
 *
 *   - the document is hidden, so `document.hidden` is true;
 *   - `requestAnimationFrame` callbacks are never delivered;
 *   - `IntersectionObserver` callbacks are never delivered either, because the
 *     browser delivers them at the end of a frame and there are no frames;
 *   - the animation timeline never advances, so every CSS animation is held at
 *     `currentTime` 0.
 *
 * All four are imposed here. The first three by a script injected before any of
 * the page's own runs, the fourth by the DevTools Animation domain's playback
 * rate plus an explicit pause of every animation at time zero before measuring.
 * The counters the injected script keeps are printed with the result, so the
 * condition is auditable rather than asserted: a run that reports 41 frame
 * callbacks requested and 0 delivered is a run that really did withhold them.
 *
 * WHAT COUNTS AS A FAILURE. Any element whose computed opacity is 0. Not
 * "effective" opacity, not a chosen sample of selectors: the whole document,
 * `document.querySelectorAll("*")`, grouped by tag and class afterwards. An
 * element hidden by an ancestor's opacity computes to 1 itself, so enumerating
 * computed 0 finds the causes rather than the consequences, and finds them
 * without anybody deciding in advance which elements were worth looking at.
 *
 * THE SECOND PASS. `settled` runs the same enumeration on a browser that paints
 * normally, after the animations have had time to finish. Nothing should be at
 * opacity 0 there either, and it is the pass that would catch an entrance that
 * strands content on a working browser rather than a frozen one.
 *
 * Usage: node scripts/hidden-audit.mjs [--json] [--out DIR]
 * Exit status is 1 if any element on any page is at opacity 0 in either pass.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, extname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const AS_JSON = args.includes("--json");
const OUT_DIR = resolve(ROOT, valueOf("--out") ?? "out");

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

/* -------------------------------------------------------------------------- */
/* The browser                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Chrome, wherever this machine keeps it.
 *
 * No npm dependency: the whole check is one WebSocket to the DevTools protocol,
 * which Node has had built in since 22, and adding Playwright to a static site
 * to answer one question about opacity is a hundred megabytes of build for a
 * number. The order is deliberate: an explicit CHROME wins, then the runner's
 * Chrome, then whatever a local Playwright install has already downloaded.
 */
function findChrome() {
  const candidates = [
    process.env.CHROME,
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);

  for (const dir of playwrightShells()) candidates.push(dir);

  for (const path of candidates) {
    if (path && existsSync(path)) return path;
  }
  throw new Error(
    "hidden-audit: no Chrome found. Set CHROME to a Chrome or Chromium binary.\n" +
      "Tried:\n  " +
      candidates.join("\n  "),
  );
}

/** Playwright's browser cache, if this machine has one, newest build first. */
function playwrightShells() {
  const caches = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    join(process.env.HOME ?? "", "Library/Caches/ms-playwright"),
    join(process.env.HOME ?? "", ".cache/ms-playwright"),
  ].filter(Boolean);

  const out = [];
  for (const cache of caches) {
    if (!existsSync(cache)) continue;
    const builds = readdirSync(cache)
      .filter((d) => d.startsWith("chromium"))
      .sort()
      .reverse();
    for (const build of builds) {
      out.push(
        join(cache, build, "chrome-headless-shell-mac-arm64/chrome-headless-shell"),
        join(cache, build, "chrome-headless-shell-linux64/chrome-headless-shell"),
        join(cache, build, "chrome-mac/Chromium.app/Contents/MacOS/Chromium"),
        join(cache, build, "chrome-linux/chrome"),
      );
    }
  }
  return out;
}

async function launch() {
  const bin = findChrome();
  const profile = mkdtempSync(join(tmpdir(), "hidden-audit-"));
  const child = spawn(
    bin,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--disable-extensions",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  const wsUrl = await new Promise((ok, fail) => {
    let buffered = "";
    const timer = setTimeout(() => fail(new Error("hidden-audit: Chrome did not report a DevTools endpoint")), 30000);
    child.stderr.on("data", (chunk) => {
      buffered += chunk;
      const m = /ws:\/\/\S+/.exec(buffered);
      if (m) {
        clearTimeout(timer);
        ok(m[0]);
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      fail(new Error(`hidden-audit: Chrome exited with ${code}\n${buffered}`));
    });
  });

  return { bin, child, wsUrl, profile };
}

/* -------------------------------------------------------------------------- */
/* The protocol                                                               */
/* -------------------------------------------------------------------------- */

class Devtools {
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((ok, fail) => {
      ws.addEventListener("open", ok, { once: true });
      ws.addEventListener("error", () => fail(new Error("hidden-audit: cannot reach DevTools")), { once: true });
    });
    return new Devtools(ws);
  }

  constructor(ws) {
    this.ws = ws;
    this.next = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined) {
        const seat = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (!seat) return;
        if (msg.error) seat.fail(new Error(`${seat.method}: ${msg.error.message}`));
        else seat.ok(msg.result);
        return;
      }
      for (const fn of this.listeners) fn(msg);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.next;
    return new Promise((ok, fail) => {
      this.pending.set(id, { ok, fail, method });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }

  /** Resolves the first time `predicate` accepts an event. */
  once(predicate, ms = 30000) {
    return new Promise((ok, fail) => {
      const timer = setTimeout(() => {
        this.listeners.delete(fn);
        fail(new Error("hidden-audit: timed out waiting for a DevTools event"));
      }, ms);
      const fn = (msg) => {
        if (!predicate(msg)) return;
        clearTimeout(timer);
        this.listeners.delete(fn);
        ok(msg);
      };
      this.listeners.add(fn);
    });
  }

  close() {
    this.ws.close();
  }
}

/* -------------------------------------------------------------------------- */
/* The pages                                                                  */
/* -------------------------------------------------------------------------- */

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};

/**
 * The export, served over http rather than opened over file://.
 *
 * Next writes absolute paths for its own assets, which a file:// document
 * resolves against the filesystem root, so opening out/index.html directly
 * gives a page with no stylesheet at all: every element would read opacity 1
 * and the check would pass by being blind.
 */
function serve(dir) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = join(dir, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!file.startsWith(dir) || !existsSync(file)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok({ server, port: server.address().port })));
}

/** Every built page, as the path a reader would visit. */
function pages(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) {
        const rel = relative(dir, full);
        out.push(rel === "index.html" ? "/" : "/" + rel.replace(/index\.html$/, ""));
      }
    }
  };
  walk(dir);
  return out;
}

/* -------------------------------------------------------------------------- */
/* The two conditions                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Injected before any of the page's own scripts, in the `frozen` pass only.
 *
 * It withholds the two callbacks a browser only delivers when it is drawing,
 * and counts what it withheld so the run can prove it did.
 */
const NO_FRAMES = `
(() => {
  const held = { rafRequested: 0, ioCreated: 0, ioObserved: 0 };
  Object.defineProperty(window, "__held", { value: held });
  Object.defineProperty(document, "hidden", { get: () => true, configurable: true });
  Object.defineProperty(document, "visibilityState", { get: () => "hidden", configurable: true });
  window.requestAnimationFrame = () => { held.rafRequested++; return 0; };
  window.cancelAnimationFrame = () => {};
  window.IntersectionObserver = class {
    constructor() { held.ioCreated++; }
    observe() { held.ioObserved++; }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
})();
`;

/**
 * The enumeration itself.
 *
 * `pause()` and `currentTime = 0` on every animation still attached is the
 * frozen timeline stated twice: the Animation domain's playback rate already
 * holds them there, and this makes the pass independent of that domain's
 * behaviour and reports how many animations were actually pinned, so a run
 * cannot come back clean because nothing was animating in the first place.
 */
const ENUMERATE = (freeze) => `
(() => {
  const froze = ${freeze};
  let pinned = 0;
  if (froze) {
    for (const a of document.getAnimations()) {
      try { a.pause(); a.currentTime = 0; pinned++; } catch {}
    }
  }
  const all = document.querySelectorAll("*");
  const hidden = [];
  for (const el of all) {
    const style = getComputedStyle(el);
    if (parseFloat(style.opacity) !== 0) continue;
    const box = el.getClientRects().length > 0;
    hidden.push({
      selector: el.tagName.toLowerCase() + (el.className && typeof el.className === "string"
        ? "." + el.className.trim().split(/\\s+/).join(".")
        : ""),
      laidOut: box,
      text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 90),
      animations: el.getAnimations().map((a) => a.animationName || "(unnamed)"),
    });
  }
  return {
    elements: all.length,
    animations: document.getAnimations().length,
    pinned,
    entering: document.querySelectorAll(".is-entering").length,
    held: window.__held ?? null,
    hidden,
  };
})();
`;

async function auditPass({ dt, origin, urls, viewports, freeze, label }) {
  const { targetId } = await dt.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await dt.send("Target.attachToTarget", { targetId, flatten: true });

  await dt.send("Page.enable", {}, sessionId);
  await dt.send("Runtime.enable", {}, sessionId);
  if (freeze) {
    await dt.send("Animation.enable", {}, sessionId);
    await dt.send("Animation.setPlaybackRate", { playbackRate: 0 }, sessionId);
    await dt.send("Page.addScriptToEvaluateOnNewDocument", { source: NO_FRAMES }, sessionId);
  }

  const rows = [];
  for (const viewport of viewports) {
    await dt.send(
      "Emulation.setDeviceMetricsOverride",
      { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false },
      sessionId,
    );

    for (const url of urls) {
      const loaded = dt.once((m) => m.sessionId === sessionId && m.method === "Page.loadEventFired");
      await dt.send("Page.navigate", { url: origin + url }, sessionId);
      await loaded;
      // Hydration has to have happened for the measurement to mean anything: an
      // unhydrated page cannot have reached any state a script puts it in. In
      // `settled` the wait also lets every entrance run to its end.
      await sleep(freeze ? 350 : 1600);

      const { result } = await dt.send(
        "Runtime.evaluate",
        { expression: ENUMERATE(freeze), returnByValue: true, awaitPromise: false },
        sessionId,
      );
      if (result.subtype === "error") throw new Error(`hidden-audit: ${result.description}`);
      rows.push({ pass: label, viewport: `${viewport.width}x${viewport.height}`, url, ...result.value });
    }
  }

  await dt.send("Target.closeTarget", { targetId });
  return rows;
}

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Close everything, and never let closing it decide the run.
 *
 * The profile directory has to outlive the browser: `kill` is a signal, not a
 * join, and Chrome on Linux goes on writing its profile for a moment after it,
 * so removing the directory immediately raced it and threw ENOTEMPTY. That
 * failed a green run on the runner while the audit itself had found nothing,
 * which is the sort of check nobody trusts twice. Waiting for the exit fixes the
 * race; the try/catch means that even if some other machine finds a new way to
 * hold a file open, a leftover temp directory cannot be mistaken for a defect on
 * the page.
 */
async function shutDown(dt, chrome, server) {
  try {
    const exited = new Promise((ok) => chrome.child.once("exit", ok));
    // Ask the browser to close before signalling the process. A signal is not a
    // join and it does not always reach the browser at all: the runner's
    // /usr/bin/google-chrome is a wrapper script, so SIGTERM ended the wrapper
    // while Chrome went on writing its profile, and the removal below hit
    // ENOTEMPTY on a run that had found nothing wrong with the site.
    await Promise.race([dt.send("Browser.close").catch(() => {}), sleep(3000)]);
    dt.close();
    server.close();
    if (chrome.child.exitCode === null) chrome.child.kill();
    await Promise.race([exited, sleep(5000)]);
    rmSync(chrome.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (err) {
    console.error(`hidden-audit: could not clean up after the browser (${err.message}). Not a failure.`);
  }
}

/* -------------------------------------------------------------------------- */
/* The report                                                                 */
/* -------------------------------------------------------------------------- */

function group(hidden) {
  const counts = new Map();
  for (const h of hidden) {
    const seat = counts.get(h.selector) ?? { n: 0, text: "", laidOut: 0 };
    seat.n += 1;
    if (h.laidOut) seat.laidOut += 1;
    if (!seat.text && h.text) seat.text = h.text;
    counts.set(h.selector, seat);
  }
  return [...counts]
    .map(([selector, seat]) => ({ selector, ...seat }))
    .sort((a, b) => b.n - a.n || a.selector.localeCompare(b.selector));
}

function report(rows) {
  const lines = [];
  const passes = [...new Set(rows.map((r) => r.pass))];

  for (const pass of passes) {
    const mine = rows.filter((r) => r.pass === pass);
    const total = mine.reduce((n, r) => n + r.hidden.length, 0);
    const elements = mine.reduce((n, r) => n + r.elements, 0);
    const rafHeld = mine.reduce((n, r) => n + (r.held?.rafRequested ?? 0), 0);
    const ioHeld = mine.reduce((n, r) => n + (r.held?.ioObserved ?? 0), 0);
    const pinned = mine.reduce((n, r) => n + r.pinned, 0);
    const entering = mine.reduce((n, r) => n + r.entering, 0);

    lines.push(`condition ${pass}`);
    lines.push(
      pass === "frozen"
        ? "  document.hidden true, requestAnimationFrame and IntersectionObserver never delivered,\n" +
            "  animation playback rate 0, every animation held at currentTime 0"
        : "  an ordinary painting browser, measured 1.6s after load",
    );
    lines.push(
      `  ${mine.length} page loads, ${elements} elements walked` +
        (pass === "frozen"
          ? `, ${rafHeld} frame callbacks requested and 0 delivered, ${ioHeld} observer targets and 0 delivered, ${pinned} animations pinned at time 0`
          : ""),
    );
    lines.push(`  .is-entering on ${entering} elements`);
    lines.push(`  elements at computed opacity 0: ${total}`);

    if (total > 0) {
      for (const row of mine) {
        if (row.hidden.length === 0) continue;
        lines.push(`  ${row.url} at ${row.viewport}: ${row.hidden.length}`);
        for (const g of group(row.hidden)) {
          lines.push(
            `    ${g.n} x ${g.selector}${g.laidOut ? "" : " (not laid out)"}${g.text ? `  "${g.text}"` : ""}`,
          );
        }
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */

async function main() {
  if (!existsSync(OUT_DIR)) {
    throw new Error(`hidden-audit: ${OUT_DIR} does not exist. Run \`npm run build\` first.`);
  }

  const urls = pages(OUT_DIR);
  const { server, port } = await serve(OUT_DIR);
  const origin = `http://127.0.0.1:${port}`;
  const chrome = await launch();
  const dt = await Devtools.connect(chrome.wsUrl);

  let rows = [];
  try {
    const viewports = [
      { width: 1280, height: 900 },
      { width: 375, height: 812 },
    ];
    rows = rows.concat(await auditPass({ dt, origin, urls, viewports, freeze: true, label: "frozen" }));
    rows = rows.concat(
      await auditPass({ dt, origin, urls, viewports: [viewports[0]], freeze: false, label: "settled" }),
    );
  } finally {
    await shutDown(dt, chrome, server);
  }

  const failures = rows.reduce((n, r) => n + r.hidden.length, 0);
  if (AS_JSON) {
    console.log(JSON.stringify({ chrome: chrome.bin, pages: urls.length, failures, rows }, null, 2));
  } else {
    console.log(`hidden-audit: ${urls.length} built pages, Chrome at ${chrome.bin}\n`);
    console.log(report(rows));
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(2);
});
