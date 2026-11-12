import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-control border p-4", {
  variants: {
    variant: {
      info: "border-line bg-surface",
      success: "border-transparent bg-accent-soft",
      warning: "border-transparent bg-warning-soft",
      danger: "border-transparent bg-danger-soft",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons: Record<NonNullable<VariantProps<typeof alertVariants>["variant"]>, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

const iconColors = {
  info: "text-muted",
  success: "text-accent",
  warning: "text-accent-2",
  danger: "text-danger",
} as const;

type Props = VariantProps<typeof alertVariants> & {
  title?: string;
  children?: ReactNode;
  className?: string;
};

/** An inline message. Errors are announced to screen readers immediately. */
export function Alert({ variant = "info", title, children, className }: Props) {
  const kind = variant ?? "info";
  const Icon = icons[kind];
  return (
    <div
      role={kind === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ variant: kind }), className)}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", iconColors[kind])} aria-hidden />
      <div className="flex flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-sm">{children}</div> : null}
      </div>
    </div>
  );
}
