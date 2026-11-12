"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "border-muted bg-surface data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-ink peer flex size-5 shrink-0 items-center justify-center rounded-[6px] border disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

type FieldProps = ComponentProps<typeof CheckboxPrimitive.Root> & { id: string; label: string };

/** A checkbox with its label. The whole row is a 44px touch target. */
export function CheckboxField({ id, label, className, ...props }: FieldProps) {
  return (
    <label
      htmlFor={id}
      className={cn("min-h-control flex cursor-pointer items-center gap-3", className)}
    >
      <Checkbox id={id} {...props} />
      <span>{label}</span>
    </label>
  );
}
