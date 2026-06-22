// WYSIWYG PDF export — captures the rendered report DOM and paginates it across
// A4 sheets, breaking BETWEEN top-level sections (never through a chart or card)
// so nothing is split or duplicated across a page boundary. Lazy-imports the
// heavy deps to keep the initial bundle small.

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const scale = 2;

  // Capture the report at 2x on a white background. Skip screen-only chrome
  // (edit controls, status banners, anything Tailwind-hidden for print) — it
  // shouldn't bleed into the exported PDF.
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
    ignoreElements: (el) =>
      el instanceof HTMLElement && el.classList.contains("print:hidden"),
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const marginMm = 8;
  const imgWidthMm = pageWidthMm - marginMm * 2;
  const usableHeightMm = pageHeightMm - marginMm * 2;

  // Canvas pixels per mm of printed width, and the page's usable height in
  // canvas pixels.
  const pxPerMm = canvas.width / imgWidthMm;
  const pageUsablePx = usableHeightMm * pxPerMm;

  // Safe cut points (canvas px from the top) = the bottom edge of each
  // top-level section. Cutting only at these keeps every section whole.
  const containerTop = element.getBoundingClientRect().top;
  const cutPoints: number[] = [];
  for (const child of Array.from(element.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.classList.contains("print:hidden")) continue;
    const bottomPx = (child.getBoundingClientRect().bottom - containerTop) * scale;
    if (bottomPx > 0 && bottomPx <= canvas.height) cutPoints.push(bottomPx);
  }
  if (
    cutPoints.length === 0 ||
    cutPoints[cutPoints.length - 1] < canvas.height
  ) {
    cutPoints.push(canvas.height);
  }
  cutPoints.sort((a, b) => a - b);

  // Greedily pack sections onto pages: from the current position, take the
  // largest section boundary that still fits in a page's usable height.
  const slices: Array<{ start: number; end: number }> = [];
  let start = 0;
  while (start < canvas.height - 1) {
    const maxEnd = start + pageUsablePx;
    let end = -1;
    for (const c of cutPoints) {
      if (c > start + 1 && c <= maxEnd + 0.5) end = c;
    }
    // A single section taller than a full page → fall back to a hard cut so we
    // still make progress.
    if (end < 0) end = Math.min(maxEnd, canvas.height);
    end = Math.min(end, canvas.height);
    if (end <= start) break;
    slices.push({ start, end });
    start = end;
  }

  // Render each slice as its own page image.
  for (let i = 0; i < slices.length; i++) {
    const { start: s, end: e } = slices[i];
    const sliceHeight = Math.round(e - s);
    if (sliceHeight <= 0) continue;

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      s,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    const imgData = pageCanvas.toDataURL("image/png");
    const sliceHeightMm = sliceHeight / pxPerMm;
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", marginMm, marginMm, imgWidthMm, sliceHeightMm);
  }

  // Safety net: if nothing was measured, fall back to a single full-height image.
  if (slices.length === 0) {
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(
      imgData,
      "PNG",
      marginMm,
      marginMm,
      imgWidthMm,
      canvas.height / pxPerMm,
    );
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
