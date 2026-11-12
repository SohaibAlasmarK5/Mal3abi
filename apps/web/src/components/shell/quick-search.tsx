"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Search box in the header. Sends the text to the courts search page. */
export function QuickSearch({
  className,
  onSubmitted,
}: {
  className?: string;
  onSubmitted?: () => void;
}) {
  const t = useTranslations("shell.search");
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? { pathname: "/courts", query: { q } } : "/courts");
    onSubmitted?.();
  }

  return (
    <form role="search" onSubmit={submit} className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <Search
        className="text-muted pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("placeholder")}
        className="h-control rounded-control border-line bg-bg text-ink placeholder:text-muted w-full border pe-3 ps-9"
      />
      <button type="submit" className="sr-only">
        {t("submit")}
      </button>
    </form>
  );
}
