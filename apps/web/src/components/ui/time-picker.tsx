"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/i18n/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

/** Times between `from` and `to` (exclusive), every `stepMinutes`, as "HH:mm". */
export function timeSlots(from = "06:00", to = "24:00", stepMinutes = 30): string[] {
  const toMinutes = (value: string) => {
    const [h = 0, m = 0] = value.split(":").map(Number);
    return h * 60 + m;
  };
  const slots: string[] = [];
  for (let t = toMinutes(from); t < toMinutes(to); t += stepMinutes) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

type Props = {
  id?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  from?: string;
  to?: string;
  /** Booking times move in half hours. */
  stepMinutes?: number;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/** Picks a time of day in half-hour steps. Values are "HH:mm" (24-hour); labels follow the language. */
export function TimePicker({
  id,
  value,
  onValueChange,
  from,
  to,
  stepMinutes,
  disabled,
  ...aria
}: Props) {
  const t = useTranslations("timePicker");
  const format = useFormat();

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} {...aria}>
        <span className="flex items-center gap-2">
          <Clock className="text-muted size-4" aria-hidden />
          <SelectValue placeholder={t("placeholder")} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {timeSlots(from, to, stepMinutes).map((slot) => (
          <SelectItem key={slot} value={slot}>
            {format.clock(slot)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
