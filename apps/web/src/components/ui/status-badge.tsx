import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export const statuses = [
  "confirmed",
  "pending",
  "completed",
  "cancelled",
  "noShow",
  "rejected",
  "expired",
  "featured",
] as const;

export type Status = (typeof statuses)[number];

const styles: Record<Status, { badge: string; dot: string }> = {
  confirmed: { badge: "bg-accent-soft", dot: "bg-accent" },
  pending: { badge: "bg-warning-soft", dot: "bg-accent-2" },
  completed: { badge: "border border-line bg-bg text-muted", dot: "bg-muted" },
  cancelled: { badge: "bg-danger-soft", dot: "bg-danger" },
  noShow: { badge: "bg-danger-soft", dot: "bg-danger" },
  rejected: { badge: "bg-danger-soft", dot: "bg-danger" },
  expired: { badge: "border border-line bg-bg text-muted", dot: "bg-muted" },
  featured: { badge: "bg-warning-soft", dot: "" },
};

/** Booking, request and court states. The label comes from the message files. */
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const t = useTranslations("status");
  const style = styles[status];

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium",
        style.badge,
        className,
      )}
    >
      {status === "featured" ? (
        <Star className="fill-accent-2 text-accent-2 size-3.5" aria-hidden />
      ) : (
        <span className={cn("size-2 rounded-full", style.dot)} aria-hidden />
      )}
      {t(status)}
    </span>
  );
}
