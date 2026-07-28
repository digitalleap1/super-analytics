"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  FileImage,
  FileText,
  Loader2,
  Presentation,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal } from "lucide-react";

import type { ReportPdfData } from "@/lib/exports/pdf-report";

type Format = "pdf" | "ppt" | "png";

type Props = {
  targetId: string;
  filename: string;
  // Used by the PowerPoint title slide.
  projectName: string;
  projectDomain: string;
  periodLabel: string;
  rangeLabel: string;
  branding?: string | null;
  // When provided, the PDF is built natively from this data (proper tables, no
  // screenshot). Falls back to the DOM-capture exporter when absent.
  reportData?: ReportPdfData;
};

const LABELS: Record<Format, string> = {
  pdf: "PDF",
  ppt: "PowerPoint (.pptx)",
  png: "PNG image",
};

export function ExportMenu(props: Props) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [optOpen, setOptOpen] = useState(false);

  const defaultPreparedBy =
    props.reportData?.agencyName?.trim() || "Digital Leap Marketing";
  const defaultGenerated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const [preparedBy, setPreparedBy] = useState(defaultPreparedBy);
  const [generatedDate, setGeneratedDate] = useState(defaultGenerated);

  async function run(
    format: Format,
    pdfOverrides?: Pick<ReportPdfData, "preparedBy" | "generatedDate">,
  ) {
    const el = document.getElementById(props.targetId);
    if (!el) {
      toast.error("Couldn't find the report container to export");
      return;
    }
    setBusy(format);
    try {
      if (format === "pdf") {
        if (props.reportData) {
          const { exportReportToPdf } = await import("@/lib/exports/pdf-report");
          await exportReportToPdf({ ...props.reportData, ...(pdfOverrides ?? {}) });
        } else {
          const { exportElementToPdf } = await import("@/lib/exports/pdf");
          await exportElementToPdf(el, props.filename);
        }
      } else if (format === "ppt") {
        const { exportElementToPpt } = await import("@/lib/exports/ppt");
        await exportElementToPpt({
          containerEl: el,
          projectName: props.projectName,
          projectDomain: props.projectDomain,
          periodLabel: props.periodLabel,
          rangeLabel: props.rangeLabel,
          branding: props.branding ?? null,
          filename: props.filename,
        });
      } else if (format === "png") {
        const { exportElementToPng } = await import("@/lib/exports/image");
        await exportElementToPng(el, props.filename);
      }
      toast.success(`Downloaded ${LABELS[format]}`);
    } catch (err) {
      console.error(err);
      toast.error(`Export failed`);
    } finally {
      setBusy(null);
    }
  }

  const supportsPdfCover = !!props.reportData;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!busy} className="gap-1">
          {busy ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1 h-4 w-4" />
          )}
          {busy ? `Exporting ${LABELS[busy]}…` : "Export"}
          {!busy ? <ChevronDown className="h-3 w-3" /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Download full report as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void run("pdf");
          }}
          disabled={!!busy}
        >
          <FileText className="mr-2 h-4 w-4 text-rose-500" />
          PDF
          <span className="ml-auto text-xs text-muted-foreground">.pdf</span>
        </DropdownMenuItem>
        {supportsPdfCover ? (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setPreparedBy(defaultPreparedBy);
              setGeneratedDate(defaultGenerated);
              setOptOpen(true);
            }}
            disabled={!!busy}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4 text-rose-500" />
            PDF with custom cover…
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void run("ppt");
          }}
          disabled={!!busy}
        >
          <Presentation className="mr-2 h-4 w-4 text-orange-500" />
          PowerPoint
          <span className="ml-auto text-xs text-muted-foreground">.pptx</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void run("png");
          }}
          disabled={!!busy}
        >
          <FileImage className="mr-2 h-4 w-4 text-blue-500" />
          PNG image
          <span className="ml-auto text-xs text-muted-foreground">.png</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={optOpen} onOpenChange={setOptOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PDF cover details</DialogTitle>
          <DialogDescription>
            Override the cover page&apos;s &ldquo;Prepared by&rdquo; and
            &ldquo;Generated&rdquo; lines for this download. Leave as-is for the
            defaults.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="pdf-preparedby">Prepared by</Label>
            <Input
              id="pdf-preparedby"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder={defaultPreparedBy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdf-generated">Generated</Label>
            <Input
              id="pdf-generated"
              value={generatedDate}
              onChange={(e) => setGeneratedDate(e.target.value)}
              placeholder={defaultGenerated}
            />
            <p className="text-xs text-muted-foreground">
              Any text — e.g. a specific date or &ldquo;{defaultGenerated}&rdquo;.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOptOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy === "pdf"}
            onClick={() => {
              setOptOpen(false);
              void run("pdf", {
                preparedBy: preparedBy.trim() || null,
                generatedDate: generatedDate.trim() || null,
              });
            }}
          >
            {busy === "pdf" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
