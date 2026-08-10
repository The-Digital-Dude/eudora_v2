"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

interface ListPaginationProps {
  page: number;
  pageSize: number;
  /** Total matching rows on the server, not the number currently rendered. */
  total: number;
  onPageChange: (page: number) => void;
  /** Singular noun for the row count, e.g. "teacher" renders "of 12 teachers". */
  label?: string;
}

/**
 * Page controls for a server-paginated list. Renders the range and total so a truncated list is
 * visible as truncated — several of these lists previously fetched a fixed page with no controls,
 * which silently hid every row past the limit.
 */
export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  label = "result",
}: ListPaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
      <p className="text-[10px] font-semibold text-muted-foreground">
        Showing {firstRow}–{lastRow} of {total} {label}
        {total === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 cursor-pointer gap-1 rounded-lg px-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>

        <span className="px-1 text-[10px] font-semibold text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 cursor-pointer gap-1 rounded-lg px-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
