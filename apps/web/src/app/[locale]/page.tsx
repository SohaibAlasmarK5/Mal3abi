import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import type { Locale } from "@mal3abi/shared/i18n";
import { DirectionalIcon } from "@/components/directional-icon";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: Locale }> };

export default function HomePage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-16">
      <div className="rounded-card border-line bg-surface border p-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted mt-3 text-lg">{t("subtitle")}</p>
        <p className="rounded-control bg-accent-soft mt-6 px-4 py-3 text-sm">{t("status")}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/dev/i18n"
            className="h-control rounded-control inline-flex items-center gap-2 px-2 font-medium underline-offset-4 hover:underline"
          >
            {t("reviewLink")}
            <DirectionalIcon icon={ArrowRight} className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
