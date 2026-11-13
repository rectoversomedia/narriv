import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { GRID, INK, PAPER, SERIF, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { ARTICLES, type Article } from "@/lib/articles";
import { SITE_NAME, SITE_URL, jsonLd } from "@/lib/seo";
import { localizedPath } from "@/lib/site-paths";
import { cn } from "@/lib/utils";

// The blog index and article pages, rendered on the server in the language of the address (English at /blog,
// Indonesian at /id/blog). Articles live in lib/articles.ts.

type Lang = "en" | "id";
const w = (lang: Lang, en: string, id: string) => (lang === "id" ? id : en);
const date = (iso: string, lang: Lang) =>
  new Date(`${iso}T00:00:00+07:00`).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

function Hero({ lang, kicker, title, lead }: { lang: Lang; kicker: string; title: string; lead?: string }) {
  return (
    <header className={cn("relative overflow-hidden pb-20 text-white", INK)}>
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.35),transparent)]" />
      <SiteHeader />
      <div className="relative mx-auto max-w-3xl px-4 pt-10 text-center sm:px-6">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#A5B4FF]">{kicker}</p>
        <h1 className={cn("mt-4 text-[32px] leading-[1.1] sm:text-[44px]", SERIF)} lang={lang}>{title}</h1>
        {lead ? <p className="mx-auto mt-4 max-w-2xl text-[16px] font-medium leading-7 text-white/65">{lead}</p> : null}
      </div>
    </header>
  );
}

function Cta({ lang }: { lang: Lang }) {
  return (
    <section className="mx-auto mt-10 max-w-3xl rounded-[22px] bg-[#101334] p-6 text-center text-white sm:p-8">
      <h2 className="text-[22px] font-black tracking-[-0.02em]">{w(lang, "See Narriv on Your Own Brand", "Coba Narriv untuk Brand Anda")}</h2>
      <p className="mx-auto mt-2 max-w-xl text-[14px] font-medium leading-6 text-white/65">
        {w(lang, "Open the live demo without signing up, or start a free 14-day trial. No card needed.", "Buka demo tanpa mendaftar, atau coba gratis 14 hari. Tanpa kartu kredit.")}
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/signup" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-[14px] font-bold text-[#101334] hover:bg-[#EEF1FF]">
          {w(lang, "Start a Free Trial", "Mulai Uji Coba Gratis")}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link href={localizedPath("/pricing", lang)} className="inline-flex h-11 items-center justify-center rounded-full px-6 text-[14px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] hover:bg-white/[0.08]">
          {w(lang, "See Pricing", "Lihat Harga")}
        </Link>
      </div>
    </section>
  );
}

export function BlogIndex({ lang }: { lang: Lang }) {
  const structured = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    url: SITE_URL + localizedPath("/blog", lang),
    inLanguage: lang,
    blogPost: ARTICLES.map((a) => ({ "@type": "BlogPosting", headline: a[lang].title, url: SITE_URL + localizedPath(`/blog/${a.slug}`, lang), datePublished: a.published })),
  };
  return (
    <div className={cn("min-h-dvh text-[#101334]", PAPER)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <Hero
        lang={lang}
        kicker="Narriv Blog"
        title={w(lang, "Guides on Media Monitoring, Reputation and Crisis Response", "Panduan Media Monitoring, Reputasi, dan Penanganan Krisis")}
        lead={w(lang, "Practical, no-nonsense guides for communications teams in Indonesia.", "Panduan praktis dan langsung ke inti untuk tim komunikasi di Indonesia.")}
      />
      <main className="mx-auto -mt-10 max-w-4xl px-4 pb-16 sm:px-6">
        <ul className="grid gap-5 sm:grid-cols-2">
          {ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link href={localizedPath(`/blog/${a.slug}`, lang)} className="group flex h-full flex-col rounded-[18px] border-[1.5px] border-[#101334] bg-white p-5 shadow-[0_4px_0_#101334] transition hover:-translate-y-0.5 sm:p-6">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">
                  {date(a.published, lang)} · {a.minutes} {w(lang, "min read", "menit baca")}
                </p>
                <h2 className="mt-2 text-[19px] font-black leading-snug tracking-[-0.015em] group-hover:text-[#465FFF]">{a[lang].title}</h2>
                <p className="mt-2 flex-1 text-[14px] font-medium leading-6 text-[#4A5578]">{a[lang].description}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#465FFF]">
                  {w(lang, "Read the Guide", "Baca Panduan")}
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Cta lang={lang} />
      </main>
      <SiteFooter />
    </div>
  );
}

export function ArticlePage({ article, lang }: { article: Article; lang: Lang }) {
  const body = article[lang];
  const url = SITE_URL + localizedPath(`/blog/${article.slug}`, lang);
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: body.title,
      description: body.description,
      datePublished: article.published,
      dateModified: article.published,
      inLanguage: lang,
      url,
      mainEntityOfPage: url,
      image: `${SITE_URL}/og-image.jpg`,
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-bulat-narriv-2026.png` } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL + localizedPath("/", lang) },
        { "@type": "ListItem", position: 2, name: "Blog", item: SITE_URL + localizedPath("/blog", lang) },
        { "@type": "ListItem", position: 3, name: body.title, item: url },
      ],
    },
  ];
  const others = ARTICLES.filter((a) => a.slug !== article.slug);
  return (
    <div className={cn("min-h-dvh text-[#101334]", PAPER)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <Hero lang={lang} kicker={`${date(article.published, lang)} · ${article.minutes} ${w(lang, "min read", "menit baca")}`} title={body.title} lead={body.description} />
      <main className="mx-auto -mt-10 max-w-3xl px-4 pb-16 sm:px-6">
        <article className="rounded-[22px] border-[1.5px] border-[#101334] bg-white p-6 shadow-[0_5px_0_#101334] sm:p-10">
          <Link href={localizedPath("/blog", lang)} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#465FFF] hover:underline">
            <ArrowLeft size={15} aria-hidden="true" />
            {w(lang, "All Guides", "Semua Panduan")}
          </Link>
          <div className="mt-6 space-y-8">
            {body.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-[21px] font-black leading-snug tracking-[-0.015em]">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="mt-3 text-[16px] leading-7 text-[#31406B]">{p}</p>
                ))}
                {s.bullets?.length ? (
                  <ul className="mt-3 space-y-2">
                    {s.bullets.map((b) => (
                      <li key={b.slice(0, 40)} className="relative pl-5 text-[16px] leading-7 text-[#31406B] before:absolute before:left-0 before:top-[11px] before:size-2 before:rounded-full before:bg-[#465FFF]">{b}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>
        <Cta lang={lang} />
        <nav aria-label={w(lang, "More guides", "Panduan lainnya")} className="mt-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#5F6B94]">{w(lang, "More Guides", "Panduan Lainnya")}</p>
          <ul className="mt-3 grid gap-3">
            {others.map((a) => (
              <li key={a.slug}>
                <Link href={localizedPath(`/blog/${a.slug}`, lang)} className="flex items-center justify-between gap-3 rounded-[14px] border border-[#DDE3EF] bg-white px-4 py-3 text-[15px] font-bold hover:border-[#465FFF] hover:text-[#465FFF]">
                  {a[lang].title}
                  <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}
