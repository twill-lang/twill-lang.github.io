import Link from "next/link";
import type { Metadata } from "next";
import { DOCS, SECTIONS } from "@/lib/docs";
import { Reveal } from "@/components/motion";
import { Footer, Nav } from "@/components/chrome";

export const metadata: Metadata = {
  title: "Documentation — twill",
  description:
    "Guides, reference and evidence for twill: the tutorial, the language guide, the type system, the self-hosting port, benchmarks and correctness.",
  alternates: { canonical: "/docs/" },
};

export default function DocsIndex() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-16">
        <Reveal>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Documentation</h1>
          <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-muted">
            Every page here is the markdown from{" "}
            <a href="https://github.com/twill-lang/twill/tree/main/docs" className="text-link hover:underline">
              twill-lang/twill
            </a>
            , rendered at build time. There is no second copy to go stale.
          </p>
        </Reveal>

        {SECTIONS.map((section, s) => {
          const docs = DOCS.filter((d) => d.section === section);
          if (!docs.length) return null;
          return (
            <section key={section} className="mt-12">
              <Reveal delay={s * 0.05}>
                <h2 className="font-mono text-xs uppercase tracking-widest text-teal">{section}</h2>
              </Reveal>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {docs.map((d, i) => (
                  <Reveal key={d.slug} delay={Math.min(i, 4) * 0.05}>
                    <Link
                      href={`/docs/${d.slug}/`}
                      className="flex h-full flex-col rounded-xl border border-edge bg-raised p-5 transition-colors hover:border-teal"
                    >
                      <span className="font-medium">{d.title}</span>
                      <span className="mt-1.5 text-sm leading-relaxed text-muted">{d.blurb}</span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
