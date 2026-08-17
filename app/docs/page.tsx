import Link from "next/link";
import type { Metadata } from "next";
import { DOCS, SECTIONS } from "@/lib/docs";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Footer, Nav } from "@/components/chrome";
import { ArrowRight } from "@/components/icons";

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
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <Reveal>
          <p className="t-eyebrow text-teal">Documentation</p>
          <h1 className="t-headline mt-4 max-w-[20ch]">Guides, reference and evidence</h1>
          <p className="t-lead mt-5 max-w-[58ch] text-[0.9375rem]">
            Every page here is the markdown from{" "}
            <a
              href="https://github.com/twill-lang/twill/tree/main/docs"
              className="text-link hover:underline"
            >
              twill-lang/twill
            </a>
            , rendered at build time. There is no second copy to go stale.
          </p>
        </Reveal>

        {SECTIONS.map((section, s) => {
          const docs = DOCS.filter((d) => d.section === section);
          if (!docs.length) return null;
          return (
            <section key={section} className="mt-16 border-t border-edge pt-8">
              <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[7rem_minmax(0,1fr)]">
                <Reveal delay={s * 0.04}>
                  <p className="t-eyebrow pt-1 text-muted">{section}</p>
                </Reveal>
                <Stagger className="hairline-grid grid sm:grid-cols-2">
                  {docs.map((d) => (
                    <StaggerItem key={d.slug}>
                      <Link
                        href={`/docs/${d.slug}/`}
                        className="group flex h-full flex-col bg-raised p-5 transition-colors hover:bg-[color-mix(in_srgb,var(--teal)_7%,var(--raised))]"
                      >
                        <span className="flex items-center justify-between gap-3 font-medium">
                          {d.title}
                          <ArrowRight
                            size={15}
                            className="text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-teal"
                          />
                        </span>
                        <span className="mt-1.5 text-sm leading-relaxed text-muted">{d.blurb}</span>
                      </Link>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
