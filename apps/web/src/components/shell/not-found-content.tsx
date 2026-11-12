import { MapPinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";

export function NotFoundContent() {
  const t = useTranslations("shell.notFound");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <EmptyState
        icon={MapPinOff}
        title={t("title")}
        description={t("body")}
        action={
          <Button asChild>
            <Link href="/">{t("home")}</Link>
          </Button>
        }
      />
    </div>
  );
}
