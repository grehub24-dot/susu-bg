"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Pagination } from "./Pagination";
import { SearchInput } from "./SearchInput";
import { SkeletonRow, SkeletonTable } from "./LoadingSpinner";
import { EmptyTable } from "./EmptyState";

export type SortDirection = "asc" | "desc" | null;

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    onPageChange: (page: number) => void;
  };
  sort?: {
    key: string;
    direction: SortDirection;
    onSort: (key: string) => void;
  };
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  loading = false,
  searchable = false,
  searchPlaceholder = "Search...",
  searchKeys = [],
  pagination,
  sort,
  emptyMessage = "No data available",
  className = "",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search || searchKeys.length === 0) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter((row) => 
      searchKeys.some((key) => {
        const value = row[key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchLower);
      })
    );
  }, [data, search, searchKeys]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sort?.key || !sort.direction) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      let comparison = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sort]);

  const handleSort = useCallback((key: string) => {
    sort?.onSort(key);
  }, [sort]);

  const renderSortIcon = (columnKey: string) => {
    if (!sort || !columnKey) return <ChevronsUpDown className="w-4 h-4 opacity-30" />;
    
    if (sort.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 opacity-30" />;
    }
    
    return sort.direction === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className={`rounded-[1.5rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden ${className}`}>
      {/* Search Bar */}
      {searchable && (
        <div className="p-4 border-b border-[color:var(--color-border)]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)] ${
                    column.sortable ? "cursor-pointer hover:text-[color:var(--color-foreground)]" : ""
                  } ${column.className || ""}`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={columns.length} />
              ))
            ) : sortedData.length === 0 ? (
              <EmptyTable message={emptyMessage} />
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={String(row[keyField]) || index}
                  className="border-b border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-2)] transition-colors"
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 text-sm ${column.className || ""}`}>
                      {column.render
                        ? column.render(row)
                        : String(row[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="border-t border-[color:var(--color-border)]">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}

// Server-side paginated DataTable
interface ServerDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    onPageChange: (page: number) => void;
    onSearchChange?: (search: string) => void;
  };
  sort?: {
    key: string;
    direction: SortDirection;
    onSort: (key: string) => void;
  };
  emptyMessage?: string;
  className?: string;
}

export function ServerDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  loading = false,
  searchable = false,
  searchPlaceholder = "Search...",
  searchKeys = [],
  pagination,
  sort,
  emptyMessage = "No data available",
  className = "",
}: ServerDataTableProps<T>) {
  const handleSearchChange = useCallback((value: string) => {
    pagination?.onSearchChange?.(value);
  }, [pagination]);

  return (
    <div className={`rounded-[1.5rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden ${className}`}>
      {/* Search Bar */}
      {searchable && (
        <div className="p-4 border-b border-[color:var(--color-border)]">
          <SearchInput
            value={pagination?.currentPage === 1 ? "" : ""} // This would need external state
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)] ${
                    column.sortable ? "cursor-pointer hover:text-[color:var(--color-foreground)]" : ""
                  } ${column.className || ""}`}
                  onClick={column.sortable ? () => sort?.onSort(column.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && (
                      sort?.key === column.key ? (
                        sort.direction === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-4 h-4 opacity-30" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={columns.length} />
              ))
            ) : data.length === 0 ? (
              <EmptyTable message={emptyMessage} />
            ) : (
              data.map((row, index) => (
                <tr
                  key={String(row[keyField]) || index}
                  className="border-b border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-2)] transition-colors"
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 text-sm ${column.className || ""}`}>
                      {column.render
                        ? column.render(row)
                        : String(row[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="border-t border-[color:var(--color-border)]">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}