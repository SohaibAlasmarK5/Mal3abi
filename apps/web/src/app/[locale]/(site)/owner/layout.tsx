import type { ReactNode } from "react";
import { RequireRole } from "@/components/shell/require-role";

/** Court owners (and admins). */
export default function Layout({ children }: { children: ReactNode }) {
  return <RequireRole roles={["owner"]}>{children}</RequireRole>;
}
