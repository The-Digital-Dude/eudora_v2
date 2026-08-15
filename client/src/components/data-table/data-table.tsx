"use client";

import {
  type ColumnDef,
  type SortingState,
  type Updater,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { ListPagination } from "@/components/list-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataState } from "@/components/ui/data-state";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading: boolean;
  isError?: boolean;

  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Singular noun passed through to ListPagination, e.g. "lead" renders "of 12 leads". */
  paginationLabel?: string;

  /** Empty string means unsorted. Server owns sort — this table never sorts client-side. */
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;

  onRowClick?: (row: TData) => void;

  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

/**
 * Server-paginated, server-sorted table. `manualPagination`/`manualSorting`
 * are always on — this component never re-slices or re-sorts `data` itself,
 * it only renders the page it's given and reports intent (page/sort changes)
 * back to the caller, which owns state via `useListQueryState` (the URL).
 *
 * Columns opt out of sorting individually with `enableSorting: false` — see
 * `SortableHeader`, which is what a column's `header` render function should
 * return for any column that should be sortable.
 */
export function DataTable<TData>({
  columns,
  data,
  isLoading,
  isError,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  paginationLabel,
  sortBy,
  sortOrder,
  onSortChange,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: DataTableProps<TData>) {
  const sorting: SortingState = sortBy ? [{ id: sortBy, desc: sortOrder === "desc" }] : [];

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const first = next[0];
    if (!first) {
      onSortChange("", "asc");
    } else {
      onSortChange(first.id, first.desc ? "desc" : "asc");
    }
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const isEmpty = !isLoading && data.length === 0;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading || isError || isEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-8">
                  <DataState
                    isLoading={isLoading}
                    isError={isError}
                    isEmpty={isEmpty}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                    emptyAction={emptyAction}
                  >
                    {null}
                  </DataState>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        label={paginationLabel}
        bordered={false}
      />
    </div>
  );
}
