import { ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";

/** Shown to a signed-in user whose role cannot open the page. */
export function NotAuthorized() {
  const t = useTranslations("shell.notAuthorized");
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <EmptyState
        icon={ShieldX}
        title={t("title")}
        description={t("body")}
        action={
          <Button asChild variant="secondary">
            <Link href="/">{t("home")}</Link>
          </Button>
        }
      />
    </div>
  );
}
