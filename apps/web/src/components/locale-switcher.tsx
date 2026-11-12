"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Switches between Arabic and English and keeps the user on the same page. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextLocale = locale === "ar" ? "en" : "ar";

  function switchLocale() {
    startTransition(() => {
      router.replace(`${pathname}${window.location.search}`, { locale: nextLocale });
    });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={isPending}
      lang={nextLocale}
      aria-label={t("ariaLabel")}
      className={cn(
        "h-control rounded-control border-line bg-surface inline-flex items-center gap-2 border px-4 font-medium disabled:opacity-60",
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      {t("label")}
    </button>
  );
}
