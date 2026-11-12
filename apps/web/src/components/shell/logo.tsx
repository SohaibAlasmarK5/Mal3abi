import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** The pitch mark and the name, as in the approved design. */
export function Logo({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const t = useTranslations("shell");
  return (
    <Link
      href="/"
      onClick={onNavigate}
      aria-label={t("home")}
      className={cn(
        "h-control text-accent inline-flex items-center gap-2.5 text-2xl font-bold no-underline",
        className,
      )}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <line x1="12" y1="5" x2="12" y2="19" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
      {t("brand")}
    </Link>
  );
}
