"use client";

import { Direction } from "radix-ui";
import type { ReactNode } from "react";
import type { Direction as Dir } from "@mal3abi/shared/i18n";

/** Client-side providers shared by every page. Radix components read the text direction here. */
export function Providers({ dir, children }: { dir: Dir; children: ReactNode }) {
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>;
}
