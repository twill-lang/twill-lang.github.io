import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCS, findDoc, load, searchIndex } from "@/lib/docs";
import { Footer, Nav } from "@/components/chrome";
import { Reveal } from "@/components/motion";
import { Toc } from "@/components/toc";
import { DocsMobileNav, DocsRail } from "@/components/docs-nav";
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

  const [{ html, headings }, index] = await Promise.all([load(doc), searchIndex()]);
  const at = DOCS.findIndex((d) => d.slug === doc.slug);
  const prev = DOCS[at - 1];
  const next = DOCS[at + 1];

  return (
    <>
      <Nav />
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Three bands, and the bar earns its place in two of them.

            Below 1024px it is the whole of the navigation: DocsRail is
            `hidden lg:block` and Toc is `hidden xl:block`, so nothing else is on
            screen and a reader has search, this page's headings and the document
            list here or nowhere.

            Between 1024px and 1280px the rail is on screen and the contents are
            not, so the bar and the rail are both visible. That is deliberate
            rather than an oversight: what the bar adds in that band is this
            page's headings, which is the half the rail does not carry. An
            earlier comment here claimed neither rail was on screen below
            1280px, which is wrong at any width from 1024px up.

            From 1280px both rails are on screen and the bar is gone,
            `xl:hidden`. */}
        <DocsMobileNav title={doc.title} current={doc.slug} headings={headings} index={index} />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_190px]">
        <DocsRail current={doc.slug} index={index} />

        <main className="min-w-0">
          <Reveal y={10}>
            <p className="t-eyebrow text-brand">{doc.section}</p>
            <h1 className="t-title mt-3">{doc.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{doc.blurb}</p>
            <a
              href={`https://github.com/twill-lang/twill/blob/main/docs/${doc.file}`}
              className="tap mt-3 inline-flex items-center gap-1.5 text-sm text-link hover:underline"
            >
              Edit this page on GitHub
              <ArrowUpRight size={14} />
            </a>
          </Reveal>

          {/* The markdown is twill's own, fetched at build time. */}
          <article
            className="prose-twill mt-8 border-t border-edge pt-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <nav className="mt-16 flex flex-col gap-3 border-t border-edge pt-6 text-sm sm:flex-row">
            {prev && (
              <Link href={`/docs/${prev.slug}/`} className="doc-step">
                <span className="t-eyebrow block text-muted">Previous</span>
                <span className="mt-1 block text-link">{prev.title}</span>
              </Link>
            )}
            {next && (
              /* `sm:text-right` rather than `text-right`: in the stacked mobile
                 column this card is full width, and right-aligned text there was
                 aligned against nothing. */
              <Link href={`/docs/${next.slug}/`} className="doc-step sm:ml-auto sm:text-right">
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
