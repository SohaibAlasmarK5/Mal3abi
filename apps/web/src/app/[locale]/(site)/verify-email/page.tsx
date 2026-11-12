import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import type { Locale } from "@mal3abi/shared/i18n";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { localeAlternates } from "@/i18n/seo";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "verifyEmail" });
  return {
    title: t("metaTitle"),
    alternates: localeAlternates(locale, "/verify-email"),
    robots: { index: false },
  };
}

/**
 * Shown when the backend answers email_not_verified. The code itself is entered on the
 * Auth Center's confirmation page; linking to it comes with the sign-in work.
 */
export default function VerifyEmailPage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("verifyEmail");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <EmptyState
        icon={MailCheck}
        title={t("title")}
        description={t("body")}
        action={
          <Button asChild variant="secondary">
            <Link href="/">{t("back")}</Link>
          </Button>
        }
      />
    </div>
  );
}
