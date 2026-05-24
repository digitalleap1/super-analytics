"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

type Column = { key: string; header: string };
type Row = Record<string, unknown>;

type Props = {
  title: string; // e.g. "Top queries"
  projectName: string;
  rangeLabel: string;
  rows: Row[];
  columns: Column[];
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Renders ONLY this table as a standalone printable page in a new window.
// Independent of the dashboard's print stylesheet so it has clean margins,
// repeating headers, and no risk of bleeding from neighbouring sections.
export function PrintTableButton({
  title,
  projectName,
  rangeLabel,
  rows,
  columns,
}: Props) {
  function print() {
    const win = window.open("", "_blank", "width=960,height=720");
    if (!win) {
      // Pop-up blocker — bail gracefully.
      alert(
        "Pop-up blocked. Please allow pop-ups for this site, then click Download PDF again.",
      );
      return;
    }

    const headerCells = columns
      .map((c) => `<th>${escapeHtml(c.header)}</th>`)
      .join("");
    const bodyRows = rows
      .map(
        (row) =>
          `<tr>${columns
            .map((c) => `<td>${escapeHtml(row[c.key])}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    const generated = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    win.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(`${title} — ${projectName}`)}</title>
<style>
  @page { size: A4; margin: 1.4cm 1.2cm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    color: #192250;
    margin: 0;
    padding: 32px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header {
    border-bottom: 2px solid #ee2770;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #ee2770;
    margin: 0;
  }
  h1 {
    font-size: 20px;
    font-weight: 600;
    margin: 4px 0;
  }
  .sub {
    font-size: 12px;
    color: #6b7280;
    margin: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  thead { display: table-header-group; }
  th {
    text-align: left;
    background: #f3f4f7;
    color: #475569;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid #f1f2f4;
    font-variant-numeric: tabular-nums;
  }
  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  tr:nth-child(even) td { background: #fafbfc; }
  .footer {
    margin-top: 24px;
    font-size: 10px;
    color: #9ca3af;
    text-align: right;
  }
</style>
</head>
<body>
  <div class="header">
    <p class="eyebrow">${escapeHtml(title)}</p>
    <h1>${escapeHtml(projectName)}</h1>
    <p class="sub">${escapeHtml(rangeLabel)}</p>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <p class="footer">Generated ${escapeHtml(generated)} · ${rows.length} row${rows.length === 1 ? "" : "s"}</p>
  <script>
    // Print as soon as fonts settle, then close the window after the dialog
    // is dismissed. setTimeout + onafterprint covers both Chrome and Firefox.
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 150);
    });
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`);
    win.document.close();
    win.focus();
  }

  return (
    <Button onClick={print} variant="outline" size="sm" className="gap-1.5">
      <Printer className="h-4 w-4" />
      Download PDF
    </Button>
  );
}
