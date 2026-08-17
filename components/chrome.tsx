import Link from "next/link";

const GH = "https://github.com/twill-lang/twill";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-ground/85 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2 font-mono text-[15px] font-semibold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/twill-mark.svg" alt="" width={20} height={20} aria-hidden />
          twill
        </Link>
        <div className="ml-auto flex items-center gap-5 text-sm text-muted">
          <Link href="/docs/" className="transition-colors hover:text-text">Docs</Link>
          <a href={`${GH}/tree/main/examples`} className="hidden transition-colors hover:text-text sm:inline">Examples</a>
          <a href={`${GH}/releases`} className="transition-colors hover:text-text">Releases</a>
          <a href={GH} className="transition-colors hover:text-text">GitHub</a>
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-edge">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center">
        <p>
          twill is MIT licensed, and an early prototype. Built by{" "}
          <a href="https://github.com/martin-k-m" className="text-link hover:underline">Martin Muskov</a>.
        </p>
        <p className="sm:ml-auto">
          <a href="https://github.com/twill-lang" className="text-link hover:underline">github.com/twill-lang</a>
        </p>
      </div>
    </footer>
  );
}
