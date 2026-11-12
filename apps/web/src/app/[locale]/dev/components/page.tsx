import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { use } from "react";
import type { Locale } from "@mal3abi/shared/i18n";
import { localeAlternates } from "@/i18n/seo";
import { ComponentsShowcase } from "./showcase";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "devComponents" });
  return {
    title: t("metaTitle"),
    alternates: localeAlternates(locale, "/dev/components"),
    robots: { index: false },
  };
}

/** Internal component review page (development only). */
export default function ComponentsPage({ params }: Props) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = use(params);
  setRequestLocale(locale);
  return <ComponentsShowcase />;
}
