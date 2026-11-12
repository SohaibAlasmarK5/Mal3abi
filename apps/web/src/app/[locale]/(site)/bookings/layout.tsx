import type { ReactNode } from "react";
import { RequireRole } from "@/components/shell/require-role";

/** Any signed-in user. */
export default function Layout({ children }: { children: ReactNode }) {
  return <RequireRole>{children}</RequireRole>;
}
