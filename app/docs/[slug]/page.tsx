import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCS, SECTIONS, findDoc, load } from "@/lib/docs";
import { Footer, Nav } from "@/components/chrome";
import { Reveal } from "@/components/motion";
import { Toc } from "@/components/toc";
import { ArrowUpRight } from "@/components/icons";

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
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_190px]">
        {/* Every doc, so a reader can move between them without going back. */}
        <nav className="hidden text-sm lg:block">
          <div className="sticky top-24 space-y-6">
            {SECTIONS.map((section) => (
              <div key={section}>
                <p className="t-eyebrow text-muted">{section}</p>
                <ul className="mt-2.5 space-y-0.5 border-l border-edge">
                  {DOCS.filter((d) => d.section === section).map((d) => (
                    <li key={d.slug}>
                      <Link
                        href={`/docs/${d.slug}/`}
                        className={`-ml-px block border-l py-1 pl-3 text-[13px] transition-colors ${
                          d.slug === doc.slug
                            ? "border-teal text-text"
                            : "border-transparent text-muted hover:border-edge hover:text-text"
                        }`}
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
            <p className="t-eyebrow text-teal">{doc.section}</p>
            <h1 className="t-title mt-3">{doc.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{doc.blurb}</p>
            <a
              href={`https://github.com/twill-lang/twill/blob/main/docs/${doc.file}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-link hover:underline"
            >
              Edit this page on GitHub
              <ArrowUpRight size={14} />
            </a>
          </Reveal>

          {/* The markdown is twill's own, fetched at build time. */}
          <article
            className="prose-twill mt-10 border-t border-edge pt-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <nav className="mt-16 flex flex-col gap-3 border-t border-edge pt-6 text-sm sm:flex-row">
            {prev && (
              <Link
                href={`/docs/${prev.slug}/`}
                className="group rounded-lg border border-edge px-4 py-3 transition-colors hover:border-teal"
              >
                <span className="t-eyebrow block text-muted">Previous</span>
                <span className="mt-1 block text-link">{prev.title}</span>
              </Link>
            )}
            {next && (
              <Link
                href={`/docs/${next.slug}/`}
                className="group rounded-lg border border-edge px-4 py-3 text-right transition-colors hover:border-teal sm:ml-auto"
              >
                <span className="t-eyebrow block text-muted">Next</span>
                <span className="mt-1 block text-link">{next.title}</span>
              </Link>
            )}
          </nav>
        </main>

        {/* Omitted when a doc has too few headings to be worth a rail. */}
        {headings.length > 2 && <Toc headings={headings} />}
      </div>
      <Footer />
    </>
  );
}
