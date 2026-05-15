"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  filename: string;
  rows: Record<string, unknown>[];
  columns: { key: string; header: string }[];
};

function toCsvCell(v: unknown): string {
  if (v == null) return "";
  let s = String(v);
  if (/[",\n]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function CsvExportButton({ filename, rows, columns }: Props) {
  function download() {
    const header = columns.map((c) => toCsvCell(c.header)).join(",");
    const body = rows
      .map((row) => columns.map((c) => toCsvCell(row[c.key])).join(","))
      .join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={download} className="gap-2">
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
