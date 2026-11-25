import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Figure({
  loading,
  children,
  className,
  width = "w-24",
  height = "h-6",
}: {
  loading: boolean;
  children: ReactNode;
  className?: string;
  width?: string;
  height?: string;
}) {
  if (loading) {
    return <span className={cn("shimmer inline-block rounded-md align-middle", height, width)} aria-hidden />;
  }
  return <span className={className}>{children}</span>;
}
