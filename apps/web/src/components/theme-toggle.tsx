"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { currentTheme, setTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Switches between light (green) and dark mode and remembers the choice. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("theme");

  return (
    <button
      type="button"
      onClick={() => setTheme(currentTheme() === "dark" ? "light" : "dark")}
      aria-label={t("toggle")}
      title={t("toggle")}
      className={cn(
        "size-control rounded-control border-line bg-surface inline-flex items-center justify-center border",
        className,
      )}
    >
      {/* Both icons render on the server; CSS shows the right one, so there is no mismatch. */}
      <Moon className="size-5 dark:hidden" aria-hidden />
      <Sun className="hidden size-5 dark:block" aria-hidden />
    </button>
  );
}
