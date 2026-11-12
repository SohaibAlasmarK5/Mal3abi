import { Construction } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import type { Locale } from "@mal3abi/shared/i18n";
import { EmptyState } from "@/components/ui/states";
import { localeAlternates } from "@/i18n/seo";

export type PlaceholderKey =
  | "courts"
  | "matches"
  | "bookings"
  | "owners"
  | "owner"
  | "admin"
  | "account"
  | "privacy"
  | "terms"
  | "contact";

type Props = { params: Promise<{ locale: Locale }> };

/** Metadata for a page that a later task builds. */
export function placeholderMetadata(key: PlaceholderKey, path: string) {
  return async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "shell.pages" });
    return { title: t(key), alternates: localeAlternates(locale, path) };
  };
}

/** A page that a later Jira task builds. Keeps every link in the shell working until then. */
export function placeholderPage(key: PlaceholderKey) {
  return function PlaceholderPage({ params }: Props) {
    const { locale } = use(params);
    setRequestLocale(locale);
    const t = useTranslations("shell");
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-3xl font-bold">{t(`pages.${key}`)}</h1>
        <EmptyState icon={Construction} title={t(`pages.${key}`)} description={t("comingSoon")} />
      </div>
    );
  };
}
