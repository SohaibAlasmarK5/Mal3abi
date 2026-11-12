import type { ReactNode } from "react";
import { RequireRole } from "@/components/shell/require-role";

/** Admins only. */
export default function Layout({ children }: { children: ReactNode }) {
  return <RequireRole roles={["admin"]}>{children}</RequireRole>;
}
