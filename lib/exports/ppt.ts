// PowerPoint export. Captures each major section of the report as a high-DPI
// image and lays it out on its own slide, with a clean title slide first.
// pptxgenjs writes a real .pptx file; clients can edit it in PowerPoint / Keynote / Slides.

type ExportPptOptions = {
  containerEl: HTMLElement;
  projectName: string;
  projectDomain: string;
  periodLabel: string; // "Monthly report"
  rangeLabel: string; // "May 1 – 28"
  branding?: string | null;
  filename: string;
};

// 16:9 default slide dimensions in inches (LAYOUT_WIDE).
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN = 0.4;
const CONTENT_W = SLIDE_W - MARGIN * 2;
const CONTENT_H = SLIDE_H - MARGIN * 2;

export async function exportElementToPpt(opts: ExportPptOptions): Promise<void> {
  const [{ default: html2canvas }, { default: pptxgen }] = await Promise.all([
    import("html2canvas"),
    import("pptxgenjs"),
  ]);

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `${opts.projectName} — ${opts.periodLabel}`;
  pptx.author = "Super Analytics";

  // --- Title slide -----------------------------------------------------------
  const title = pptx.addSlide();
  // Pink accent strip on the left edge to echo the brand
  title.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.35,
    h: SLIDE_H,
    fill: { color: "EE2770" },
    line: { color: "EE2770" },
  });
  title.addText(opts.periodLabel.toUpperCase(), {
    x: 1.0,
    y: 2.4,
    w: 11,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: "EE2770",
    charSpacing: 3,
  });
  title.addText(opts.projectName, {
    x: 1.0,
    y: 2.85,
    w: 11,
    h: 1.4,
    fontSize: 44,
    bold: true,
    color: "192250",
  });
  title.addText(`${opts.projectDomain} · ${opts.rangeLabel}`, {
    x: 1.0,
    y: 4.3,
    w: 11,
    h: 0.4,
    fontSize: 16,
    color: "6B7280",
  });
  if (opts.branding) {
    title.addText(opts.branding, {
      x: 1.0,
      y: 6.7,
      w: 11,
      h: 0.4,
      fontSize: 12,
      italic: true,
      color: "6B7280",
    });
  }

  // --- Section slides --------------------------------------------------------
  // Capture each direct child of #report-pdf that's marked as a slidable
  // section (we tag KPI grid, charts row, keywords, tables, backlinks with
  // data-pptx-slide on the EditableProjectReport).
  const slidableNodes = opts.containerEl.querySelectorAll<HTMLElement>(
    "[data-pptx-slide]",
  );
  const sections = slidableNodes.length
    ? Array.from(slidableNodes)
    : Array.from(opts.containerEl.children).filter(
        (n): n is HTMLElement => n instanceof HTMLElement,
      );

  for (const section of sections) {
    // Skip clearly empty sections.
    if (section.offsetHeight < 30) continue;

    let canvas;
    try {
      canvas = await html2canvas(section, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: section.scrollWidth,
      });
    } catch {
      continue;
    }

    const imgData = canvas.toDataURL("image/png");
    const aspect = canvas.height / canvas.width;

    // Fit the captured image into the slide while preserving aspect ratio,
    // then centre it.
    let w = CONTENT_W;
    let h = w * aspect;
    if (h > CONTENT_H) {
      h = CONTENT_H;
      w = h / aspect;
    }
    const x = MARGIN + (CONTENT_W - w) / 2;
    const y = MARGIN + (CONTENT_H - h) / 2;

    const slide = pptx.addSlide();
    // Tiny header strip with project name in the top-left so each slide is
    // identifiable on its own.
    slide.addText(`${opts.projectName} · ${opts.rangeLabel}`, {
      x: MARGIN,
      y: 0.05,
      w: CONTENT_W,
      h: 0.3,
      fontSize: 10,
      color: "9CA3AF",
    });
    slide.addImage({
      data: imgData,
      x,
      y: Math.max(y, 0.4),
      w,
      h: Math.min(h, CONTENT_H - 0.4),
    });
  }

  await pptx.writeFile({
    fileName: opts.filename.endsWith(".pptx")
      ? opts.filename
      : `${opts.filename}.pptx`,
  });
}
