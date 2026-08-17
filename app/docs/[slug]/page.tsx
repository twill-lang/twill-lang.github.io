import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCS, findDoc, load } from "@/lib/docs";
import { Footer, Nav } from "@/components/chrome";
import { Reveal } from "@/components/motion";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = findDoc(slug);
  if (!doc) return {};
  return {
    title: `${doc.title} — twill`,
    description: doc.blurb,
    alternates: { canonical: `/docs/${doc.slug}/` },
  };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = findDoc(slug);
  if (!doc) notFound();

  const { html, headings } = await load(doc);
  const index = DOCS.findIndex((d) => d.slug === doc.slug);
  const prev = DOCS[index - 1];
  const next = DOCS[index + 1];

  return (
    <>
      <Nav />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[200px_minmax(0,1fr)_180px]">
        {/* Every doc, so a reader can move between them without going back. */}
        <nav className="hidden text-sm lg:block">
          <div className="sticky top-20 space-y-5">
            {["Start here", "Reference", "Under the hood", "Evidence"].map((section) => (
              <div key={section}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-teal">{section}</p>
                <ul className="mt-2 space-y-1.5">
                  {DOCS.filter((d) => d.section === section).map((d) => (
                    <li key={d.slug}>
                      <Link
                        href={`/docs/${d.slug}/`}
                        className={
                          d.slug === doc.slug
                            ? "text-text"
                            : "text-muted transition-colors hover:text-text"
                        }
                      >
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <main className="min-w-0">
          <Reveal y={10}>
            <p className="font-mono text-xs uppercase tracking-widest text-teal">{doc.section}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{doc.title}</h1>
            <p className="mt-2 text-sm text-muted">{doc.blurb}</p>
            <a
              href={`https://github.com/twill-lang/twill/blob/main/docs/${doc.file}`}
              className="mt-3 inline-block text-sm text-link hover:underline"
            >
              Edit this page on GitHub
            </a>
          </Reveal>

          {/* The markdown is twill's own, fetched at build time. */}
          <article className="prose-twill mt-10" dangerouslySetInnerHTML={{ __html: html }} />

          <nav className="mt-16 flex gap-3 border-t border-edge pt-6 text-sm">
            {prev && (
              <Link href={`/docs/${prev.slug}/`} className="text-link hover:underline">
                ← {prev.title}
              </Link>
            )}
            {next && (
              <Link href={`/docs/${next.slug}/`} className="ml-auto text-link hover:underline">
                {next.title} →
              </Link>
            )}
          </nav>
        </main>

        {/* On this page. Omitted when a doc has too few headings to be worth a rail. */}
        {headings.length > 2 && (
          <nav className="hidden text-sm xl:block">
            <div className="sticky top-20">
              <p className="font-mono text-[10px] uppercase tracking-widest text-teal">On this page</p>
              <ul className="mt-2 space-y-1.5">
                {headings.map((h, i) => (
                  <li key={`${h.id}-${i}`} className={h.level === 3 ? "pl-3" : undefined}>
                    <a href={`#${h.id}`} className="text-muted transition-colors hover:text-text">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </div>
      <Footer />
    </>
  );
}
