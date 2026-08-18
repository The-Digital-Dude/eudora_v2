"use client";

import { type Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface SortableHeaderProps<TData> {
  column: Column<TData, unknown>;
  label: string;
  align?: "left" | "right";
}

/**
 * Header cell for a DataTable column. Columns opt out of sorting via
 * `enableSorting: false` on their ColumnDef — those render as plain text,
 * matching every other header in the table.
 */
export function SortableHeader<TData>({ column, label, align = "left" }: SortableHeaderProps<TData>) {
  const baseClass =
    "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";

  if (!column.getCanSort()) {
    return <span className={baseClass}>{label}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={`flex cursor-pointer items-center gap-1 ${baseClass} hover:text-foreground ${
        align === "right" ? "ml-auto" : ""
      }`}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}
