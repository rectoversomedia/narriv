import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/marketing/blog";
import { ARTICLES, findArticle } from "@/lib/articles";
import { publicPageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = findArticle((await params).slug);
  if (!article) return {};
  const base = publicPageMetadata({ lang: "id", path: `/blog/${article.slug}`, title: article.id.title, description: article.id.description });
  return { ...base, openGraph: { ...base.openGraph, type: "article", publishedTime: article.published } };
}

export default async function BlogArticle({ params }: Props) {
  const article = findArticle((await params).slug);
  if (!article) notFound();
  return (
    <SiteLanguage lang="id">
      <ArticlePage article={article} lang="id" />
    </SiteLanguage>
  );
}
