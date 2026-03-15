"use client";

/**
 * Reusable DataTable Component
 *
 * Standard table layout with filter bar, loading state, empty state.
 * Reference: Brand Registry, Warehouse Registry, Company Registry tables.
 *
 * Usage:
 * <DataTable
 *     filters={<>
 *         <DataTableSearch value={search} onChange={setSearch} placeholder="Search..." />
 *         <Select ...>...</Select>
 *     </>}
 *     loading={isLoading}
 *     empty={{ icon: Tag, message: "NO BRANDS FOUND", action: <Button>Create</Button> }}
 *     columns={["BRAND", "COMPANY", "STATUS"]}
 * >
 *     {items.map((item, index) => (
 *         <DataTableRow key={item.id} index={index}>
 *             <TableCell>...</TableCell>
 *         </DataTableRow>
 *     ))}
 * </DataTable>
 */

import { ReactNode } from "react";
import { LucideIcon, Search } from "lucide-react";
import { Input } from "./input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "./table";

// ---------------------------------------------------------------------------
// DataTableSearch — standard search input for filter bars
// ---------------------------------------------------------------------------

interface DataTableSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function DataTableSearch({
    value,
    onChange,
    placeholder = "Search...",
    className,
}: DataTableSearchProps) {
    return (
        <div className={`relative flex-1 max-w-md ${className || ""}`}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10 font-mono text-sm"
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// DataTableRow — standard row with hover and staggered animation
// ---------------------------------------------------------------------------

interface DataTableRowProps {
    children: ReactNode;
    index?: number;
    className?: string;
    onClick?: () => void;
}

export function DataTableRow({ children, index = 0, className, onClick }: DataTableRowProps) {
    return (
        <TableRow
            className={`group hover:bg-muted/30 transition-colors border-border/50 ${onClick ? "cursor-pointer" : ""} ${className || ""}`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={onClick}
        >
            {children}
        </TableRow>
    );
}

// ---------------------------------------------------------------------------
// DataTable — main component
// ---------------------------------------------------------------------------

interface DataTableProps {
    /** Filter bar content — search inputs, selects, toggle buttons */
    filters?: ReactNode;
    /** Column header labels (uppercase) */
    columns: (string | { label: string; className?: string })[];
    /** Loading state */
    loading?: boolean;
    /** Empty state configuration */
    empty?: {
        icon?: LucideIcon;
        message: string;
        action?: ReactNode;
    };
    /** Table body content — use DataTableRow + TableCell */
    children: ReactNode;
    /** Whether there are items to display (controls empty state) */
    hasData?: boolean;
}

export function DataTable({
    filters,
    columns,
    loading,
    empty,
    children,
    hasData = true,
}: DataTableProps) {
    const EmptyIcon = empty?.icon;

    return (
        <>
            {/* Filter bar */}
            {filters && (
                <div className="border-b border-border bg-card px-8 py-4">
                    <div className="flex items-center gap-4 flex-wrap">{filters}</div>
                </div>
            )}

            {/* Table content */}
            <div className="px-8 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm font-mono text-muted-foreground animate-pulse">
                            LOADING...
                        </div>
                    </div>
                ) : !hasData ? (
                    <div className="text-center py-12 space-y-3">
                        {EmptyIcon && (
                            <EmptyIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        )}
                        <p className="font-mono text-sm text-muted-foreground">
                            {empty?.message || "NO DATA FOUND"}
                        </p>
                        {empty?.action}
                    </div>
                ) : (
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border/50">
                                    {columns.map((col, i) => {
                                        const label = typeof col === "string" ? col : col.label;
                                        const className =
                                            typeof col === "string" ? "" : col.className || "";
                                        return (
                                            <TableHead
                                                key={i}
                                                className={`font-mono text-xs font-bold ${className}`}
                                            >
                                                {label}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>{children}</TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </>
    );
}
