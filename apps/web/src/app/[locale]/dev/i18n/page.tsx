import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { use } from "react";
import { localized, type Locale, type LocalizedText } from "@mal3abi/shared/i18n";
import { DirectionalIcon } from "@/components/directional-icon";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useFormat } from "@/i18n/format";
import { Link } from "@/i18n/navigation";
import { localeAlternates } from "@/i18n/seo";

type Props = { params: Promise<{ locale: Locale }> };

// Sample rows shaped like backend content (court names come in both languages).
const courtInBothLanguages: LocalizedText = { ar: "ملعب النخبة", en: "Elite Court" };
const courtInArabicOnly: LocalizedText = { ar: "ملعب الشمال", en: null };
const sampleDate = new Date("2026-11-12T14:30:00Z");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "devI18n" });
  return {
    title: t("metaTitle"),
    alternates: localeAlternates(locale, "/dev/i18n"),
    robots: { index: false },
  };
}

/** Internal review page (development only). */
export default function I18nReviewPage({ params }: Props) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("devI18n");
  const format = useFormat();

  const rows = [
    [t("number"), format.number(1234.5)],
    [t("price"), format.price(21)],
    [t("price"), format.price(7.5)],
    [t("date"), format.date(sampleDate)],
    [t("shortDate"), format.shortDate(sampleDate)],
    [t("time"), format.time(sampleDate)],
  ] as const;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted mt-2">{t("intro")}</p>
        </div>
        <LocaleSwitcher />
      </header>

      <section className="rounded-card border-line bg-surface border p-6">
        <h2 className="text-lg font-semibold">{t("formatting")}</h2>
        <dl className="divide-line mt-4 divide-y">
          {rows.map(([label, value], index) => (
            <div key={index} className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-end font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-card border-line bg-surface border p-6">
        <h2 className="text-lg font-semibold">{t("content")}</h2>
        <dl className="divide-line mt-4 divide-y">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted">{t("bothLanguages")}</dt>
            <dd className="text-end font-medium">{localized(courtInBothLanguages, locale)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted">{t("fallback")}</dt>
            <dd className="text-end font-medium">{localized(courtInArabicOnly, locale)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-card border-line bg-surface border p-6">
        <h2 className="text-lg font-semibold">{t("direction")}</h2>
        <div className="mt-4 flex justify-between gap-4">
          <span className="h-control rounded-control border-line inline-flex items-center gap-2 border px-4">
            <DirectionalIcon icon={ArrowLeft} className="size-4" />
            {t("back")}
          </span>
          <span className="h-control rounded-control bg-accent text-accent-ink inline-flex items-center gap-2 px-4 font-semibold">
            {t("next")}
            <DirectionalIcon icon={ArrowRight} className="size-4" />
          </span>
        </div>
      </section>

      <Link href="/" className="text-muted underline underline-offset-4">
        {t("home")}
      </Link>
    </main>
  );
}
