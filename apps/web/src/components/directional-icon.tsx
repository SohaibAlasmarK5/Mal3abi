import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = LucideProps & { icon: LucideIcon };

/**
 * An icon that points a direction (arrows, chevrons). Draw it for English (LTR);
 * it is mirrored automatically in Arabic (RTL).
 */
export function DirectionalIcon({ icon: Icon, className, ...props }: Props) {
  return <Icon aria-hidden className={cn("rtl:-scale-x-100", className)} {...props} />;
}
