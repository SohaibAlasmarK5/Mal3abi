import { hasLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use, type ReactNode } from "react";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { routing } from "@/i18n/routing";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

/** The fixed frame around every public and account page: header, content, footer. */
export default function SiteLayout({ children, params }: Props) {
  const { locale } = use(params);
  setRequestLocale(hasLocale(routing.locales, locale) ? locale : routing.defaultLocale);
  const t = useTranslations("shell");

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#content"
        className="focus:rounded-control focus:bg-surface sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main id="content" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
