import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { themeScript } from "@/components/theme-toggle";

// Vendored for the same reason the sibling site vendors them: next/font/google
// fetches at build time, which turns a network blip on the runner into a failed
// deploy. Both faces are SIL OFL 1.1 and their licences travel beside them.
const inter = localFont({
  src: "./fonts/inter-latin-variable.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const mono = localFont({
  src: "./fonts/jetbrains-mono-latin-variable.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

const SITE = "https://twill-lang.github.io";
const TITLE = "twill — a tensor-first language for AI and ML";
const DESCRIPTION =
  "twill is a small language where tensors are the primitive, grad is built in, and a shape mistake is an error you see before the program runs. MIT licensed, one dependency-free Go binary.";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareSourceCode",
      "@id": `${SITE}/#twill`,
      name: "twill",
      description: DESCRIPTION,
      url: SITE,
      codeRepository: "https://github.com/twill-lang/twill",
      programmingLanguage: { "@type": "ComputerLanguage", name: "twill" },
      license: "https://opensource.org/licenses/MIT",
      author: { "@type": "Person", name: "Martin Muskov", url: "https://github.com/martin-k-m" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#site`,
      url: SITE,
      name: "twill",
      description: DESCRIPTION,
      inLanguage: "en",
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "twill",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
  icons: { icon: "/favicon.ico", apple: "/twill-mark-180.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5faf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b211d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* suppressHydrationWarning: the script below stamps data-theme on this
       element before React sees it, which is a server/client difference by
       design and the only one on the page. */
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        {/* Ahead of everything, so the temper is settled before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* The entrances used to need an override here, because their start
            state was written into the prerendered markup and only a script
            could clear it. They do not any more: nothing on this site is
            hidden at rest, so a page with no script is the finished page.
            See components/motion.tsx.

            What is left is the two controls that genuinely do nothing without
            JavaScript. The docs disclosure and the search field are hidden
            rather than left on the page as dead furniture; the nav's Docs link
            still reaches the index, which lists every page. */}
        <noscript>
          <style>{`.doc-bar,.doc-search{display:none}`}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
