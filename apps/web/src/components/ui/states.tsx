import { AlertTriangle, Inbox, Loader2, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A spinning indicator. `label` is read by screen readers. */
export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex", className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

/** A grey placeholder block shown while content loads. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("rounded-control bg-line animate-pulse", className)}
      {...props}
    />
  );
}

/** Full block shown while a section loads. */
export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const t = useTranslations("states");
  return (
    <div
      className={cn(
        "rounded-card border-line bg-surface text-muted flex flex-col items-center justify-center gap-3 border p-8",
        className,
      )}
    >
      <Spinner label={label ?? t("loading")} />
      <p className="text-sm">{label ?? t("loading")}</p>
    </div>
  );
}

type MessageStateProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** A button or link, for example "Add a court" or "Try again". */
  action?: ReactNode;
  className?: string;
};

/** Shown when a list or page has nothing to show yet. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: MessageStateProps) {
  const t = useTranslations("states");
  return (
    <div
      className={cn(
        "rounded-card border-line bg-surface flex flex-col items-center gap-3 border p-8 text-center",
        className,
      )}
    >
      <span className="bg-accent-soft flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="text-lg font-semibold">{title ?? t("emptyTitle")}</h3>
      {description ? <p className="text-muted max-w-md">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Shown when loading failed. Pass a retry button as `action`. */
export function ErrorState({
  title,
  description,
  icon: Icon = AlertTriangle,
  action,
  className,
}: MessageStateProps) {
  const t = useTranslations("states");
  return (
    <div
      role="alert"
      className={cn(
        "rounded-card border-line bg-surface flex flex-col items-center gap-3 border p-8 text-center",
        className,
      )}
    >
      <span className="bg-danger-soft text-danger flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="text-lg font-semibold">{title ?? t("errorTitle")}</h3>
      <p className="text-muted max-w-md">{description ?? t("errorDescription")}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
