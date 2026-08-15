"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface ListPaginationProps {
  page: number;
  pageSize: number;
  /** Total matching rows on the server, not the number currently rendered. */
  total: number;
  onPageChange: (page: number) => void;
  /** Singular noun for the row count, e.g. "teacher" renders "of 12 teachers". */
  label?: string;
  /**
   * Separator line above the controls. Defaults on — this is the only visual
   * boundary between a card-grid list (e.g. assessments) and its pagination
   * row. DataTable turns it off: its own bordered table box already draws
   * that boundary, so the line would just be a redundant second one.
   */
  bordered?: boolean;
  /** Omit to hide the page-size selector entirely (unchanged behavior). */
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
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
  bordered = true,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: ListPaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <div
      className={`flex flex-col items-center justify-between gap-3 sm:flex-row ${
        bordered ? "border-t border-border pt-4" : ""
      }`}
    >
      <p className="text-[10px] font-semibold text-muted-foreground">
        Showing {firstRow}–{lastRow} of {total} {label}
        {total === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground">Per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-8 w-[68px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
    </div>
  );
}
