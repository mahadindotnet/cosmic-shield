import { History } from "lucide-react";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface HistoryColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export interface HistoryTableProps<T> {
  title?: string;
  description?: string;
  columns: HistoryColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

/** Log of previous entries for a module. Newest first is the caller's job. */
export function HistoryTable<T>({
  title = "History",
  description,
  columns,
  rows,
  getRowId,
  emptyMessage = "No entries yet. Your logged readings will appear here.",
  className,
}: HistoryTableProps<T>) {
  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="size-4 text-primary/80" aria-hidden="true" />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
        <CardAction>
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </span>
        </CardAction>
      </CardHeader>

      <div className="px-2">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(
                    "console-label h-9 !text-[10px]",
                    c.align === "right" && "text-right",
                    c.className,
                  )}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-20 text-center text-xs whitespace-normal text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(
                        c.align === "right" && "text-right font-mono tabular-nums",
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
