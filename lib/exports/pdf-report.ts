// Native, premium agency-style PDF report built directly from report DATA with
// jsPDF — no DOM screenshot. Real text, visual KPI cards, native trend charts,
// wrapping tables (no clipping), keyword winners/losers, page breaks, and a
// white-label footer.
//
// Section order: cover → executive summary → KPI cards → performance charts →
// traffic channels → top queries → top pages → keyword rankings (+ winners &
// losers) → backlinks → work completed / on-page tasks → analysis → appendix
// (daily data).

import type {
  DailyMetric,
  Ga4ChannelRow,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";
import type { KeywordRow } from "@/lib/keywords";
import { BACKLINK_CATEGORIES, type BacklinkRow } from "@/lib/backlinks";
import {
  parseOtherTasksValue,
  taskHref,
  type CustomTask,
} from "@/lib/other-tasks";

export type ReportMetric = {
  label: string;
  value: string;
  change: string;
  direction: "up" | "down" | "flat";
};

export type ReportPdfData = {
  filename: string;
  projectName: string;
  projectDomain: string;
  periodLabel: string; // "Monthly report"
  rangeLabel: string;
  brandingHeader?: string | null;
  logoUrl?: string | null;
  agencyName?: string | null;
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

type RGB = [number, number, number];
const PINK: RGB = [224, 31, 124];
const NAVY: RGB = [27, 38, 82];
const INK: RGB = [33, 37, 51];
const MUTED: RGB = [110, 116, 134];
const GREEN: RGB = [16, 122, 70];
const RED: RGB = [200, 35, 60];
const HEADER_BG: RGB = [27, 38, 82];
const ROW_ALT: RGB = [245, 246, 250];
const BORDER: RGB = [223, 226, 234];
const CARD_BG: RGB = [250, 250, 252];
const LINK: RGB = [37, 99, 235];

const nf = new Intl.NumberFormat("en-US");
const num = (n: number) => nf.format(Math.round(n ?? 0));
const pctFrac = (frac: number) => `${((frac ?? 0) * 100).toFixed(1)}%`;
const posStr = (n: number | null) => (n == null ? "—" : n.toFixed(1));
// Ensures a link target is an absolute, clickable URL (backlink rows may store
// the display form without a scheme).
const absoluteUrl = (u: string) =>
  /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`;

// Category colors are stored as CSS "hsl(h s% l%)" strings; jsPDF needs RGB.
function hslToRgb(hsl: string): RGB {
  const m = hsl.match(/hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i);
  if (!m) return [128, 128, 128];
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

// Walks a parsed HTML body into plain text, turning block elements and <br> into
// line breaks and list items into bullets — so rich-text survives as readable
// PDF prose instead of raw tags.
function domToText(root: Node): string {
  const BLOCK = new Set([
    "P", "DIV", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6",
    "SECTION", "ARTICLE", "BLOCKQUOTE", "TR", "TABLE", "HEADER", "FOOTER",
  ]);
  let out = "";
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        out += child.textContent ?? "";
      } else if (child.nodeType === 1) {
        const el = child as Element;
        const tag = el.tagName;
        if (tag === "BR") {
          out += "\n";
          return;
        }
        if (tag === "LI") {
          out += "\n• ";
          walk(el);
          out += "\n";
          return;
        }
        const block = BLOCK.has(tag);
        if (block) out += "\n";
        walk(el);
        if (block) out += "\n";
      }
    });
  };
  walk(root);
  return out;
}

// The free-text fields ("other tasks", "analysis") are rich-text HTML from the
// editor. For the PDF we need clean prose (no tags/entities) plus the real links
// to render as buttons. This runs during a browser export, so DOMParser is
// available (it also repairs the malformed/nested anchors some editors emit); a
// tag-strip is kept as a fallback.
function parseRichText(input: string): {
  prose: string;
  links: { label: string; url: string }[];
} {
  const looksHtml = /<[a-z!/][\s\S]*>/i.test(input);
  const links: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  const pushLink = (rawUrl: string, label = "") => {
    const u = rawUrl.trim().replace(/[.,);]+$/, "");
    if (!/^https?:\/\//i.test(u) || seen.has(u)) return;
    seen.add(u);
    links.push({ url: u, label: label.trim() });
  };

  let prose = input;
  if (looksHtml && typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(input, "text/html");
    parsed
      .querySelectorAll("a[href]")
      .forEach((a) => pushLink(a.getAttribute("href") ?? "", a.textContent ?? ""));
    prose = domToText(parsed.body);
  } else if (looksHtml) {
    prose = input
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|ul|ol|tr)\s*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;|&apos;/gi, "'");
    Array.from(input.matchAll(/href\s*=\s*["']([^"']+)["']/gi)).forEach((m) =>
      pushLink(m[1]),
    );
  }

  // Any bare URLs left in the text also become buttons and are stripped from the
  // prose so long links don't clutter it.
  Array.from(prose.matchAll(/https?:\/\/[^\s)]+/g)).forEach((m) => pushLink(m[0]));
  prose = prose
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { prose, links };
}

type Align = "left" | "right";
type Column = { header: string; width: number; align?: Align };

async function loadImage(
  url: string,
): Promise<{ dataUrl: string; format: string; ratio: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const ratio: number = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve(img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1);
      img.onerror = () => resolve(1);
      img.src = dataUrl;
    });
    const t = blob.type;
    const format = t.includes("png")
      ? "PNG"
      : t.includes("jpeg") || t.includes("jpg")
        ? "JPEG"
        : t.includes("webp")
          ? "WEBP"
          : "PNG";
    return { dataUrl, format, ratio: ratio || 1 };
  } catch {
    return null;
  }
}

export async function exportReportToPdf(data: ReportPdfData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const bottom = pageH - margin - 6; // leave room for footer

  const agency = data.agencyName?.trim() || "Digital Leap Marketing";
  const reportType = data.periodLabel.replace(/report/i, "").trim();
  const coverTitle = `${reportType ? reportType + " " : ""}SEO Performance Report`;

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  let y = margin;
  const ensure = (space: number) => {
    if (y + space > bottom) {
      doc.addPage();
      y = margin;
    }
  };

  // ── COVER PAGE ─────────────────────────────────────────────────────────
  const logo = data.logoUrl ? await loadImage(data.logoUrl) : null;
  let cy = 60;
  if (logo) {
    const w = 44;
    const h = Math.min(w * logo.ratio, 44);
    try {
      doc.addImage(logo.dataUrl, logo.format, (pageW - w) / 2, cy, w, h);
      cy += h + 14;
    } catch {
      cy += 4;
    }
  } else {
    cy += 10;
  }

  setText(NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(data.projectName, pageW / 2, cy, { align: "center" });
  cy += 11;

  setText(PINK);
  doc.setFontSize(15);
  doc.text(coverTitle, pageW / 2, cy, { align: "center" });
  cy += 9;

  setText(MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.projectDomain, pageW / 2, cy, { align: "center" });
  cy += 14;

  setDraw(BORDER);
  doc.setLineWidth(0.4);
  doc.line(pageW / 2 - 35, cy, pageW / 2 + 35, cy);
  cy += 14;

  const coverLine = (label: string, value: string) => {
    setText(MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label.toUpperCase(), pageW / 2, cy, { align: "center" });
    cy += 5.5;
    setText(INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(value, pageW / 2, cy, { align: "center" });
    cy += 11;
  };
  coverLine("Reporting Period", data.rangeLabel);
  coverLine("Prepared By", agency);
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  coverLine("Generated", today);

  // ── CONTENT ────────────────────────────────────────────────────────────
  doc.addPage();
  y = margin;

  const sectionHeading = (title: string) => {
    ensure(12);
    setFill(PINK);
    doc.rect(margin, y - 1, 1.6, 6, "F");
    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, margin + 4, y + 4);
    y += 10;
  };

  const paragraph = (text: string) => {
    setText(INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    for (const line of lines) {
      ensure(5.4);
      doc.text(line, margin, y + 3.5);
      y += 5.4;
    }
    y += 3;
  };

  // Clickable pill button (e.g. a linked Google Sheet) with a small arrow.
  const linkButton = (label: string, url: string) => {
    ensure(11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    const tw = doc.getTextWidth(label);
    const bw = tw + 12;
    const bh = 8;
    setFill(PINK);
    doc.roundedRect(margin, y, bw, bh, 1.5, 1.5, "F");
    setText([255, 255, 255]);
    doc.text(label, margin + 4, y + bh - 2.8);
    setFill([255, 255, 255]);
    const ax = margin + 4 + tw + 2.5;
    const ay = y + bh / 2;
    doc.triangle(ax, ay - 1.6, ax, ay + 1.6, ax + 2.4, ay, "F");
    doc.link(margin, y, bw, bh, { url });
    y += bh + 4;
  };

  // One custom "other task": pink marker + bold name, notes prose, and a
  // clickable link pill when a URL was given.
  const taskBlock = (t: CustomTask) => {
    ensure(14);
    if (t.title) {
      setFill(PINK);
      doc.rect(margin, y + 1.1, 1.4, 3.4, "F");
      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      const lines = doc.splitTextToSize(t.title, contentW - 6) as string[];
      for (const line of lines) {
        ensure(5.6);
        doc.text(line, margin + 4, y + 4);
        y += 5.6;
      }
    }
    if (t.notes) {
      setText(INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(t.notes, contentW - 6) as string[];
      for (const line of lines) {
        ensure(5);
        doc.text(line, margin + 4, y + 3.4);
        y += 5;
      }
    }
    if (t.url) {
      y += 1.5;
      const url = taskHref(t.url);
      const isSheet =
        /docs\.google\.com\/spreadsheets|sheets\.google\.com/i.test(url);
      linkButton(isSheet ? "View sheet" : "Open link", url);
    }
    y += 3;
  };

  const arrow = (dir: "up" | "down" | "flat", x: number, yc: number, c: RGB) => {
    setFill(c);
    if (dir === "up") doc.triangle(x, yc + 1.6, x + 3, yc + 1.6, x + 1.5, yc - 1.4, "F");
    else if (dir === "down") doc.triangle(x, yc - 1.4, x + 3, yc - 1.4, x + 1.5, yc + 1.6, "F");
    else {
      setFill(MUTED);
      doc.rect(x, yc, 3, 0.8, "F");
    }
  };

  // Visual KPI cards (3 per row).
  const kpiCards = (metrics: ReportMetric[]) => {
    const perRow = 3;
    const gap = 4;
    const cardW = (contentW - gap * (perRow - 1)) / perRow;
    const cardH = 24;
    for (let i = 0; i < metrics.length; i++) {
      const colIdx = i % perRow;
      if (colIdx === 0) ensure(cardH + 4);
      const x = margin + colIdx * (cardW + gap);
      const m = metrics[i];
      setFill(CARD_BG);
      setDraw(BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
      setText(MUTED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(m.label.toUpperCase(), x + 4, y + 6);
      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(m.value, x + 4, y + 15);
      const dirColor = m.direction === "up" ? GREEN : m.direction === "down" ? RED : MUTED;
      arrow(m.direction, x + 4, y + 20, dirColor);
      setText(dirColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(m.change, x + 9, y + 21);
      if (colIdx === perRow - 1 || i === metrics.length - 1) y += cardH + gap;
    }
    y += 2;
  };

  // Native line chart for one series.
  const lineChart = (
    x0: number,
    w: number,
    h: number,
    title: string,
    points: { label: string; value: number }[],
    color: RGB,
    invert = false,
  ) => {
    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, x0, y + 3);
    const top = y + 6;
    const chartH = h - 12;
    const chartBottom = top + chartH;
    const plotX = x0 + 14;
    const plotW = w - 16;

    const vals = points.map((p) => p.value);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (min === max) {
      min = min - 1;
      max = max + 1;
    }
    // axes
    setDraw(BORDER);
    doc.setLineWidth(0.2);
    doc.line(plotX, top, plotX, chartBottom);
    doc.line(plotX, chartBottom, plotX + plotW, chartBottom);
    // y labels
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const topLabel = invert ? min : max;
    const botLabel = invert ? max : min;
    doc.text(formatAxis(topLabel), x0, top + 2);
    doc.text(formatAxis(botLabel), x0, chartBottom);
    // map value -> y
    const yOf = (v: number) => {
      const frac = (v - min) / (max - min);
      return invert ? top + frac * chartH : chartBottom - frac * chartH;
    };
    const xOf = (i: number) =>
      points.length <= 1 ? plotX : plotX + (i / (points.length - 1)) * plotW;
    // line
    setDraw(color);
    doc.setLineWidth(0.7);
    for (let i = 1; i < points.length; i++) {
      doc.line(xOf(i - 1), yOf(points[i - 1].value), xOf(i), yOf(points[i].value));
    }
    // x labels (first / last)
    if (points.length) {
      setText(MUTED);
      doc.setFontSize(6);
      doc.text(points[0].label, plotX, chartBottom + 4);
      doc.text(points[points.length - 1].label, plotX + plotW, chartBottom + 4, {
        align: "right",
      });
    }
  };

  const formatAxis = (v: number) =>
    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(v % 1 ? 1 : 0);

  // Two charts per row.
  const chartGrid = (
    charts: {
      title: string;
      points: { label: string; value: number }[];
      color: RGB;
      invert?: boolean;
    }[],
  ) => {
    const gap = 6;
    const w = (contentW - gap) / 2;
    const h = 42;
    for (let i = 0; i < charts.length; i += 2) {
      ensure(h + 4);
      const rowTop = y;
      lineChart(margin, w, h, charts[i].title, charts[i].points, charts[i].color, charts[i].invert);
      if (charts[i + 1]) {
        const yBackup = y;
        y = rowTop;
        lineChart(
          margin + w + gap,
          w,
          h,
          charts[i + 1].title,
          charts[i + 1].points,
          charts[i + 1].color,
          charts[i + 1].invert,
        );
        y = yBackup;
      }
      y = rowTop + h + 4;
    }
  };

  // Donut chart + legend for the backlinks category breakdown (mirrors the
  // on-screen chart). jsPDF has no arc primitive, so each slice is drawn as a
  // fan of filled triangles from the center; a white inner circle punches the
  // hole, and white radial lines separate the slices.
  const donutChart = (
    slices: { label: string; value: number; color: RGB }[],
    total: number,
    caption: string,
  ) => {
    const size = 44;
    ensure(size + 6);
    const top = y;
    const cx = margin + size / 2;
    const cyc = top + size / 2;
    const rOuter = size / 2;
    const rInner = rOuter * 0.6;
    const TAU = Math.PI * 2;

    let a0 = -Math.PI / 2; // start at 12 o'clock
    const bounds: number[] = [a0];
    for (const s of slices) {
      const frac = total > 0 ? s.value / total : 0;
      const a1 = a0 + frac * TAU;
      const steps = Math.max(2, Math.ceil(((a1 - a0) / Math.PI) * 45)); // ~2°
      // One filled polygon per slice (center → arc → close) — avoids the hairline
      // seams a triangle fan leaves between sub-triangles.
      const segs: number[][] = [];
      let px = cx + rOuter * Math.cos(a0);
      let py = cyc + rOuter * Math.sin(a0);
      segs.push([px - cx, py - cyc]);
      for (let i = 1; i <= steps; i++) {
        const t = a0 + ((a1 - a0) * i) / steps;
        const nx = cx + rOuter * Math.cos(t);
        const ny = cyc + rOuter * Math.sin(t);
        segs.push([nx - px, ny - py]);
        px = nx;
        py = ny;
      }
      setFill(s.color);
      doc.lines(segs, cx, cyc, [1, 1], "F", true);
      a0 = a1;
      bounds.push(a1);
    }

    if (slices.length > 1) {
      setDraw([255, 255, 255]);
      doc.setLineWidth(0.7);
      for (const b of bounds) {
        doc.line(
          cx + rInner * Math.cos(b), cyc + rInner * Math.sin(b),
          cx + rOuter * Math.cos(b), cyc + rOuter * Math.sin(b),
        );
      }
    }

    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cyc, rInner, "F");

    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(String(total), cx, cyc + 0.5, { align: "center" });
    setText(MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.text(caption.toUpperCase(), cx, cyc + 4.5, { align: "center" });

    // Legend: two columns to the right of the donut.
    const legendX = margin + size + 10;
    const legendW = contentW - size - 10;
    const colW = legendW / 2;
    const perCol = Math.ceil(slices.length / 2);
    const rowH = 6;
    slices.forEach((s, i) => {
      const c = Math.floor(i / perCol);
      const r = i % perCol;
      const lx = legendX + c * colW;
      const ly = top + 5 + r * rowH;
      setFill(s.color);
      doc.roundedRect(lx, ly - 2.8, 2.8, 2.8, 0.6, 0.6, "F");
      const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
      setText(INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      let lbl = s.label;
      const labelMaxW = colW - 20;
      if (doc.getTextWidth(lbl) > labelMaxW) {
        while (lbl.length > 3 && doc.getTextWidth(lbl + "…") > labelMaxW)
          lbl = lbl.slice(0, -1);
        lbl += "…";
      }
      doc.text(lbl, lx + 4.5, ly);
      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.text(String(s.value), lx + colW - 11, ly, { align: "right" });
      setText(MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(`${pct}%`, lx + colW - 3, ly, { align: "right" });
    });

    y = top + Math.max(size, perCol * rowH + 6) + 4;
  };

  // Wrapping table (cells wrap, header repeats, alternating shading).
  const table = (
    columns: Column[],
    rows: string[][],
    directions?: (("up" | "down" | "flat") | null)[][],
    // Optional per-cell absolute URL; a cell with a URL renders as an underlined
    // blue link and the whole cell area becomes clickable (so wrapped URLs link
    // in full).
    links?: (string | null)[][],
  ) => {
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
      for (const c of columns) {
        const tx = c.align === "right" ? x + c.width - pad : x + pad;
        doc.text(c.header, tx, y + headerH - 2.6, {
          align: c.align === "right" ? "right" : "left",
        });
        x += c.width;
      }
      y += headerH;
    };
    ensure(headerH + 10);
    drawHeader();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    rows.forEach((row, ri) => {
      const cellLines = row.map(
        (cell, ci) =>
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
      columns.forEach((c, ci) => {
        const url = links?.[ri]?.[ci] ?? null;
        const dir = directions?.[ri]?.[ci] ?? null;
        setText(url ? LINK : dir === "up" ? GREEN : dir === "down" ? RED : INK);
        const tx = c.align === "right" ? x + c.width - pad : x + pad;
        let ty = y + pad + 2.6;
        for (const line of cellLines[ci]) {
          doc.text(line, tx, ty, { align: c.align === "right" ? "right" : "left" });
          if (url) {
            const lw = doc.getTextWidth(line);
            const ux = c.align === "right" ? tx - lw : tx;
            setDraw(LINK);
            doc.setLineWidth(0.2);
            doc.line(ux, ty + 0.8, ux + lw, ty + 0.8);
          }
          ty += lh;
        }
        // Whole-cell clickable area so a wrapped URL is fully linked.
        if (url) doc.link(x, y, c.width, rowH, { url });
        x += c.width;
      });
      y += rowH;
    });
    setDraw(BORDER);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 7;
  };

  const col = (frac: number, header: string, align?: Align): Column => ({
    header,
    width: contentW * frac,
    align,
  });

  // ── Executive summary ──
  if (data.summaryNarrative) {
    sectionHeading("Executive Summary");
    paragraph(data.summaryNarrative);
  }

  // ── KPI cards ──
  if (data.metrics.length) {
    sectionHeading("Key Metrics");
    kpiCards(data.metrics);
  }

  // ── Performance charts ──
  if (data.dailySeries && data.dailySeries.length > 1) {
    sectionHeading("Performance Trends");
    const s = data.dailySeries;
    const lbl = (d: string) => d.slice(5); // MM-DD
    chartGrid([
      { title: "Organic Clicks", points: s.map((d) => ({ label: lbl(d.date), value: d.clicks })), color: PINK },
      { title: "Impressions", points: s.map((d) => ({ label: lbl(d.date), value: d.impressions })), color: NAVY },
      { title: "CTR (%)", points: s.map((d) => ({ label: lbl(d.date), value: d.ctr * 100 })), color: [16, 122, 70] },
      { title: "Avg Position", points: s.map((d) => ({ label: lbl(d.date), value: d.position })), color: [217, 119, 6], invert: true },
    ]);
  }

  // ── Traffic channels ──
  if (data.channels?.length) {
    sectionHeading("Traffic Channels");
    table(
      [col(0.36, "Channel"), col(0.18, "Sessions", "right"), col(0.18, "Users", "right"), col(0.16, "Engagement", "right"), col(0.12, "Events", "right")],
      data.channels.map((r) => [r.channel, num(r.sessions), num(r.totalUsers), pctFrac(r.engagementRate), num(r.eventCount)]),
    );
  }

  // ── Top queries ──
  if (data.topQueries?.length) {
    sectionHeading("Top Search Queries");
    table(
      [col(0.4, "Query"), col(0.15, "Clicks", "right"), col(0.18, "Impressions", "right"), col(0.12, "CTR", "right"), col(0.15, "Position", "right")],
      data.topQueries.map((r) => [r.query, num(r.clicks), num(r.impressions), pctFrac(r.ctr), posStr(r.position)]),
    );
  }

  // ── Top pages ──
  if (data.topPages?.length) {
    sectionHeading("Top Pages");
    table(
      [col(0.4, "Page"), col(0.15, "Clicks", "right"), col(0.18, "Impressions", "right"), col(0.12, "CTR", "right"), col(0.15, "Position", "right")],
      data.topPages.map((r) => [r.page.replace(/^https?:\/\//, ""), num(r.clicks), num(r.impressions), pctFrac(r.ctr), posStr(r.position)]),
      undefined,
      data.topPages.map((r) => [absoluteUrl(r.page), null, null, null, null]),
    );
  }

  // ── Keyword rankings ──
  if (data.keywords?.length) {
    sectionHeading("Keyword Rankings");
    table(
      [col(0.34, "Keyword"), col(0.12, "Country"), col(0.12, "Device"), col(0.12, "Position", "right"), col(0.1, "Δ", "right"), col(0.1, "Clicks", "right"), col(0.1, "Impr.", "right")],
      data.keywords.map((k) => [
        k.query,
        k.country.toUpperCase(),
        k.device,
        posStr(k.currentPosition),
        k.delta == null ? "—" : (k.delta > 0 ? "+" : "") + k.delta.toFixed(1),
        num(k.clicks),
        num(k.impressions),
      ]),
      data.keywords.map((k) => [
        null, null, null, null,
        k.delta == null || k.delta === 0 ? "flat" : k.delta > 0 ? "up" : "down",
        null, null,
      ]),
    );

    // Winners & losers
    const movers = data.keywords.filter(
      (k) => k.delta != null && k.delta !== 0 && k.startPosition != null && k.currentPosition != null,
    );
    const gainers = movers.filter((k) => (k.delta ?? 0) > 0).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)).slice(0, 8);
    const losers = movers.filter((k) => (k.delta ?? 0) < 0).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)).slice(0, 8);
    if (gainers.length) {
      sectionHeading("Top Gainers");
      table(
        [col(0.6, "Keyword"), col(0.13, "Was", "right"), col(0.13, "Now", "right"), col(0.14, "Δ", "right")],
        gainers.map((k) => [k.query, posStr(k.startPosition), posStr(k.currentPosition), "+" + (k.delta ?? 0).toFixed(1)]),
        gainers.map(() => [null, null, null, "up"]),
      );
    }
    if (losers.length) {
      sectionHeading("Biggest Drops");
      table(
        [col(0.6, "Keyword"), col(0.13, "Was", "right"), col(0.13, "Now", "right"), col(0.14, "Δ", "right")],
        losers.map((k) => [k.query, posStr(k.startPosition), posStr(k.currentPosition), (k.delta ?? 0).toFixed(1)]),
        losers.map(() => [null, null, null, "down"]),
      );
    }
  }

  // ── Backlinks ──
  if (data.backlinks?.length) {
    sectionHeading("Backlinks");

    // Category breakdown donut (mirrors the on-screen chart).
    const counts = new Map<string, number>();
    for (const { row } of data.backlinks) {
      counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    }
    const slices = BACKLINK_CATEGORIES.map((c) => ({
      label: c.label,
      value: counts.get(c.value) ?? 0,
      color: hslToRgb(c.color),
    })).filter((s) => s.value > 0);
    if (slices.length) {
      setText(MUTED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      ensure(6);
      doc.text("CATEGORIES IN RANGE", margin, y + 2);
      y += 5;
      donutChart(slices, data.backlinks.length, "backlinks");
    }

    table(
      [col(0.26, "Category"), col(0.4, "URL"), col(0.18, "Place"), col(0.16, "Date", "right")],
      data.backlinks.map(({ row, categoryLabel }) => [
        categoryLabel,
        row.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        row.place ?? "—",
        row.submittedAt,
      ]),
      undefined,
      data.backlinks.map(({ row }) => [null, absoluteUrl(row.url), null, null]),
    );
  }

  // ── Work completed / other tasks ──
  // Preferred shape: structured custom tasks (name + link + notes). Projects
  // still holding the old free-text blob fall back to the rich-text renderer.
  if (data.otherTasks && data.otherTasks.trim()) {
    const { tasks, legacyHtml } = parseOtherTasksValue(data.otherTasks);
    if (tasks.length) {
      sectionHeading("Work Completed & Other Tasks");
      for (const t of tasks) taskBlock(t);
    } else if (legacyHtml) {
      sectionHeading("Work Completed & Other Tasks");
      const { prose, links } = parseRichText(legacyHtml);
      if (prose) paragraph(prose);
      for (const { url, label } of links) {
        const isSheet =
          /docs\.google\.com\/spreadsheets|sheets\.google\.com/i.test(url);
        // Prefer the link's own text as the button label when clean and short.
        const clean =
          label && !/^https?:\/\//i.test(label) && label.length <= 42
            ? label
            : "";
        linkButton(clean || (isSheet ? "View sheet" : "Open link"), url);
      }
    }
  }

  // ── Analysis ──
  if (data.analysisNotes && data.analysisNotes.trim()) {
    sectionHeading("Analysis & Insights");
    const { prose, links } = parseRichText(data.analysisNotes);
    if (prose) paragraph(prose);
    for (const { url, label } of links) {
      const clean =
        label && !/^https?:\/\//i.test(label) && label.length <= 42 ? label : "";
      linkButton(clean || "Open link", url);
    }
  }

  // ── Appendix: daily data ──
  if (data.dailySeries?.length) {
    sectionHeading("Appendix — Daily Performance");
    table(
      [col(0.28, "Date"), col(0.18, "Clicks", "right"), col(0.22, "Impressions", "right"), col(0.14, "CTR", "right"), col(0.18, "Position", "right")],
      data.dailySeries.map((d) => [d.date, num(d.clicks), num(d.impressions), pctFrac(d.ctr), posStr(d.position)]),
    );
  }

  // ── Footer page numbers on every content page ──
  const pages = doc.getNumberOfPages();
  for (let p = 2; p <= pages; p++) {
    doc.setPage(p);
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Page ${p - 1} of ${pages - 1}`, pageW - margin, pageH - 6, {
      align: "right",
    });
  }

  doc.save(data.filename.endsWith(".pdf") ? data.filename : `${data.filename}.pdf`);
}
