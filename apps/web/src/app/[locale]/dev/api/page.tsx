import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { use } from "react";
import type { Locale } from "@mal3abi/shared/i18n";
import { localeAlternates } from "@/i18n/seo";
import { ApiReview } from "./api-review";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "devApi" });
  return {
    title: t("metaTitle"),
    alternates: localeAlternates(locale, "/dev/api"),
    robots: { index: false },
  };
}

/** Internal page that exercises the generated API client (development only). */
export default function ApiReviewPage({ params }: Props) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = use(params);
  setRequestLocale(locale);
  return <ApiReview />;
}
