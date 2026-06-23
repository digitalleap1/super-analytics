// Native, structured PDF export for a project report.
//
// Unlike the screenshot exporter (lib/exports/pdf.ts), this builds the PDF
// directly from the report DATA with jsPDF — real text and real tables with
// wrapping cells (no clipping/truncation), proper alignment, and automatic page
// breaks. Sections are laid out in order: title → summary → key metrics → data
// tables → notes.

import type {
  DailyMetric,
  Ga4ChannelRow,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";
import type { KeywordRow } from "@/lib/keywords";
import type { BacklinkRow } from "@/lib/backlinks";

export type ReportMetric = {
  label: string;
  value: string;
  change: string; // "+12.3%", "−4 places", "—"
  direction: "up" | "down" | "flat";
};

export type ReportPdfData = {
  filename: string;
  projectName: string;
  projectDomain: string;
  periodLabel: string; // "Monthly report"
  rangeLabel: string; // "May 26 – Jun 22"
  brandingHeader?: string | null;
  generatedAtLabel?: string | null;
  summaryNarrative?: string | null;
  metrics: ReportMetric[];
  topQueries?: GscQueryRow[];
  topPages?: GscPageRow[];
  channels?: Ga4ChannelRow[];
  keywords?: KeywordRow[];
  backlinks?: { row: BacklinkRow; categoryLabel: string }[];
  dailySeries?: DailyMetric[];
  analysisNotes?: string | null;
  otherTasks?: string | null;
};

// ── brand palette ──────────────────────────────────────────────────────────
const PINK: [number, number, number] = [224, 31, 124];
const NAVY: [number, number, number] = [27, 38, 82];
const INK: [number, number, number] = [33, 37, 51];
const MUTED: [number, number, number] = [110, 116, 134];
const GREEN: [number, number, number] = [16, 122, 70];
const RED: [number, number, number] = [200, 35, 60];
const HEADER_BG: [number, number, number] = [27, 38, 82];
const ROW_ALT: [number, number, number] = [245, 246, 250];
const BORDER: [number, number, number] = [223, 226, 234];

const nf = new Intl.NumberFormat("en-US");
const num = (n: number) => nf.format(Math.round(n ?? 0));
const pct = (frac: number) => `${((frac ?? 0) * 100).toFixed(1)}%`;
const pos = (n: number | null) => (n == null ? "—" : n.toFixed(1));

type Align = "left" | "right";
type Column = { header: string; width: number; align?: Align };

export async function exportReportToPdf(data: ReportPdfData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const bottom = pageH - margin;

  let y = margin;

  const setFill = (c: [number, number, number]) => doc.setFillColor(...c);
  const setText = (c: [number, number, number]) => doc.setTextColor(...c);

  function ensure(space: number) {
    if (y + space > bottom) {
      doc.addPage();
      y = margin;
    }
  }

  // ── Title block ────────────────────────────────────────────────────────
  setText(PINK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(data.periodLabel.toUpperCase(), margin, y + 2);
  y += 7;

  setText(NAVY);
  doc.setFontSize(20);
  doc.text(data.projectName, margin, y + 3);
  y += 9;

  setText(MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${data.projectDomain}  ·  ${data.rangeLabel}`, margin, y + 2);
  y += 6;
  if (data.brandingHeader) {
    doc.text(data.brandingHeader, margin, y + 2);
    y += 5;
  }
  if (data.generatedAtLabel) {
    doc.setFontSize(8);
    doc.text(`Generated ${data.generatedAtLabel}`, margin, y + 1);
    y += 4;
  }
  // divider
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1, pageW - margin, y + 1);
  y += 7;

  // ── helpers ──────────────────────────────────────────────────────────────
  function sectionHeading(title: string) {
    ensure(12);
    setText(PINK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, margin, y + 3);
    y += 8;
  }

  function paragraph(text: string) {
    setText(INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    const lh = 5.4;
    for (const line of lines) {
      ensure(lh);
      doc.text(line, margin, y + 3.5);
      y += lh;
    }
    y += 2;
  }

  // Wrapping table renderer — cells wrap (never truncate), header repeats on new
  // pages, alternating row shading.
  function table(columns: Column[], rows: string[][], directions?: ("up" | "down" | "flat" | null)[][]) {
    const pad = 2;
    const lh = 4.4;
    const headerH = 8;

    const drawHeader = () => {
      setFill(HEADER_BG);
      doc.rect(margin, y, contentW, headerH, "F");
      setText([255, 255, 255]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      let x = margin;
      for (const col of columns) {
        const tx = col.align === "right" ? x + col.width - pad : x + pad;
        doc.text(col.header, tx, y + headerH - 2.6, {
          align: col.align === "right" ? "right" : "left",
        });
        x += col.width;
      }
      y += headerH;
    };

    ensure(headerH + 10);
    drawHeader();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    rows.forEach((row, ri) => {
      // wrap each cell, compute row height
      const cellLines = row.map((cell, ci) =>
        doc.splitTextToSize(String(cell ?? ""), columns[ci].width - pad * 2) as string[],
      );
      const rowH = Math.max(...cellLines.map((l) => l.length)) * lh + pad * 1.5;

      if (y + rowH > bottom) {
        doc.addPage();
        y = margin;
        drawHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
      }

      if (ri % 2 === 1) {
        setFill(ROW_ALT);
        doc.rect(margin, y, contentW, rowH, "F");
      }

      let x = margin;
      columns.forEach((col, ci) => {
        const dir = directions?.[ri]?.[ci] ?? null;
        if (dir === "up") setText(GREEN);
        else if (dir === "down") setText(RED);
        else setText(INK);
        const tx = col.align === "right" ? x + col.width - pad : x + pad;
        let ty = y + pad + 2.6;
        for (const line of cellLines[ci]) {
          doc.text(line, tx, ty, {
            align: col.align === "right" ? "right" : "left",
          });
          ty += lh;
        }
        x += col.width;
      });
      y += rowH;
    });

    // bottom border
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 7;
  }

  function col(frac: number, header: string, align?: Align): Column {
    return { header, width: contentW * frac, align };
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  if (data.summaryNarrative) {
    sectionHeading("Summary");
    paragraph(data.summaryNarrative);
  }

  // ── Key metrics ─────────────────────────────────────────────────────────
  if (data.metrics.length) {
    sectionHeading("Key metrics");
    table(
      [col(0.5, "Metric"), col(0.28, "Value", "right"), col(0.22, "Change", "right")],
      data.metrics.map((m) => [m.label, m.value, m.change]),
      data.metrics.map((m) => [null, null, m.direction]),
    );
  }

  // ── Top queries ─────────────────────────────────────────────────────────
  if (data.topQueries?.length) {
    sectionHeading("Top search queries");
    table(
      [
        col(0.4, "Query"),
        col(0.15, "Clicks", "right"),
        col(0.18, "Impressions", "right"),
        col(0.12, "CTR", "right"),
        col(0.15, "Position", "right"),
      ],
      data.topQueries.map((r) => [
        r.query,
        num(r.clicks),
        num(r.impressions),
        pct(r.ctr),
        pos(r.position),
      ]),
    );
  }

  // ── Top pages ─────────────────────────────────────────────────────────────
  if (data.topPages?.length) {
    sectionHeading("Top pages");
    table(
      [
        col(0.4, "Page"),
        col(0.15, "Clicks", "right"),
        col(0.18, "Impressions", "right"),
        col(0.12, "CTR", "right"),
        col(0.15, "Position", "right"),
      ],
      data.topPages.map((r) => [
        r.page.replace(/^https?:\/\//, ""),
        num(r.clicks),
        num(r.impressions),
        pct(r.ctr),
        pos(r.position),
      ]),
    );
  }

  // ── GA4 channels ─────────────────────────────────────────────────────────
  if (data.channels?.length) {
    sectionHeading("Traffic channels");
    table(
      [
        col(0.36, "Channel"),
        col(0.18, "Sessions", "right"),
        col(0.18, "Users", "right"),
        col(0.16, "Engagement", "right"),
        col(0.12, "Events", "right"),
      ],
      data.channels.map((r) => [
        r.channel,
        num(r.sessions),
        num(r.totalUsers),
        pct(r.engagementRate),
        num(r.eventCount),
      ]),
    );
  }

  // ── Keywords ─────────────────────────────────────────────────────────────
  if (data.keywords?.length) {
    sectionHeading("Tracked keywords");
    table(
      [
        col(0.34, "Keyword"),
        col(0.12, "Country", "left"),
        col(0.12, "Device", "left"),
        col(0.12, "Position", "right"),
        col(0.1, "Δ", "right"),
        col(0.1, "Clicks", "right"),
        col(0.1, "Impr.", "right"),
      ],
      data.keywords.map((k) => [
        k.query,
        k.country.toUpperCase(),
        k.device,
        pos(k.currentPosition),
        k.delta == null ? "—" : (k.delta > 0 ? "+" : "") + k.delta.toFixed(1),
        num(k.clicks),
        num(k.impressions),
      ]),
      data.keywords.map((k) => [
        null,
        null,
        null,
        null,
        k.delta == null || k.delta === 0 ? "flat" : k.delta > 0 ? "up" : "down",
        null,
        null,
      ]),
    );
  }

  // ── Backlinks ─────────────────────────────────────────────────────────────
  if (data.backlinks?.length) {
    sectionHeading("Backlinks");
    table(
      [
        col(0.26, "Category"),
        col(0.4, "URL"),
        col(0.18, "Place"),
        col(0.16, "Date", "right"),
      ],
      data.backlinks.map(({ row, categoryLabel }) => [
        categoryLabel,
        row.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        row.place ?? "—",
        row.submittedAt,
      ]),
    );
  }

  // ── Daily performance (the chart data, as a table) ───────────────────────
  if (data.dailySeries?.length) {
    sectionHeading("Daily performance");
    table(
      [
        col(0.28, "Date"),
        col(0.18, "Clicks", "right"),
        col(0.22, "Impressions", "right"),
        col(0.14, "CTR", "right"),
        col(0.18, "Position", "right"),
      ],
      data.dailySeries.map((d) => [
        d.date,
        num(d.clicks),
        num(d.impressions),
        pct(d.ctr),
        pos(d.position),
      ]),
    );
  }

  // ── Analysis & other tasks ───────────────────────────────────────────────
  if (data.analysisNotes && data.analysisNotes.trim()) {
    sectionHeading("Analysis");
    paragraph(data.analysisNotes.trim());
  }
  if (data.otherTasks && data.otherTasks.trim()) {
    sectionHeading("Other tasks");
    paragraph(data.otherTasks.trim());
  }

  // ── Footer page numbers ──────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `${data.projectName} · ${data.rangeLabel}`,
      margin,
      pageH - 6,
    );
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 6, {
      align: "right",
    });
  }

  doc.save(
    data.filename.endsWith(".pdf") ? data.filename : `${data.filename}.pdf`,
  );
}
