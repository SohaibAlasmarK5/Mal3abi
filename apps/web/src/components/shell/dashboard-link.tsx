"use client";

import { LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session";
import { dashboardFor } from "./nav-items";

/** The owner or admin dashboard link, for those roles only. */
export function DashboardLink({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell.account");
  const session = useSession();
  const dashboard = dashboardFor(session.account);
  if (!dashboard) return null;

  return (
    <Button asChild variant="secondary" className={className}>
      <Link href={dashboard.href} onClick={onNavigate}>
        <LayoutDashboard aria-hidden />
        {t(dashboard.key)}
      </Link>
    </Button>
  );
}
