import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { EmptyState } from "./empty-state";
import { Skeleton } from "./skeleton";

interface DataStateProps {
  /** Number of skeleton rows/cards to show while loading */
  loadingRows?: number;
  /** Custom loading skeleton — overrides default skeleton rows */
  loadingSkeleton?: React.ReactNode;
  isLoading: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  /** Shown when isEmpty is true */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** Shown when isError is true */
  errorTitle?: string;
  errorDescription?: string;
  className?: string;
  children: React.ReactNode;
}

export function DataState({
  isLoading,
  isError = false,
  isEmpty = false,
  loadingRows = 3,
  loadingSkeleton,
  emptyTitle = "No data found",
  emptyDescription,
  emptyIcon,
  emptyAction,
  errorTitle = "Something went wrong",
  errorDescription = "Could not load data. Please try again.",
  className,
  children,
}: DataStateProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
        {loadingSkeleton ??
          Array.from({ length: loadingRows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-8 w-8" />}
        title={errorTitle}
        description={errorDescription}
        className={cn("border-destructive/30 bg-destructive/5", className)}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return <>{children}</>;
}
