import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Offset content below fixed nav (matches Navigation h-[4.25rem]). */
  withNavOffset?: boolean;
}

/**
 * Standard full-page wrapper: semantic canvas + text from CSS variables.
 */
export function PageShell({ className, withNavOffset, ...props }: PageShellProps) {
  return (
    <div
      className={cn(
        "app-page relative font-sans",
        withNavOffset && "pt-[4.25rem]",
        className
      )}
      {...props}
    />
  );
}
