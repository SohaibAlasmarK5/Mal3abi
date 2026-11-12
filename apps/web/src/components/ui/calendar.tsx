"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { arSA, enGB } from "react-day-picker/locale";
import { directionOf, intlLocale, timeZone } from "@mal3abi/shared/i18n";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof DayPicker>;

/**
 * Date picker in the active language and direction. Month and weekday names use the
 * Levantine forms (for example "تشرين الثاني"), digits are Western, weeks start on Saturday.
 */
export function Calendar({ className, classNames, ...props }: Props) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const defaults = getDefaultClassNames();
  const monthFormat = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone,
  });
  const weekdayFormat = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    timeZone,
  });

  return (
    <DayPicker
      dir={directionOf(locale)}
      locale={locale === "ar" ? arSA : enGB}
      numerals="latn"
      weekStartsOn={6}
      timeZone={timeZone}
      showOutsideDays
      formatters={{
        formatCaption: (month) => monthFormat.format(month),
        formatWeekdayName: (day) => weekdayFormat.format(day),
      }}
      labels={{
        labelPrevious: () => t("previousMonth"),
        labelNext: () => t("nextMonth"),
      }}
      className={cn("rounded-card border-line bg-surface text-ink w-fit border p-3", className)}
      classNames={{
        root: cn(defaults.root, "relative"),
        months: "relative flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex h-control items-center justify-center px-12",
        caption_label: "font-semibold",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous:
          "inline-flex size-control items-center justify-center rounded-control hover:bg-accent-soft disabled:opacity-40",
        button_next:
          "inline-flex size-control items-center justify-center rounded-control hover:bg-accent-soft disabled:opacity-40",
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "w-11 text-center text-xs font-medium text-muted",
        week: "mt-1 flex",
        day: "p-0 text-center",
        day_button:
          "inline-flex size-11 items-center justify-center rounded-control hover:bg-accent-soft disabled:pointer-events-none",
        selected:
          "[&>button]:bg-accent [&>button]:font-semibold [&>button]:text-accent-ink [&>button]:hover:bg-accent",
        today: "[&>button]:border [&>button]:border-accent",
        outside: "text-muted opacity-60",
        disabled: "text-muted opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        // "left" means previous. Mirrored in Arabic so previous points right, as the months flow.
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-5 rtl:-scale-x-100", chevronClass)} aria-hidden />
          ) : (
            <ChevronRight className={cn("size-5 rtl:-scale-x-100", chevronClass)} aria-hidden />
          ),
      }}
      {...props}
    />
  );
}
