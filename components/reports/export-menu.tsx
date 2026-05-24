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
};

const LABELS: Record<Format, string> = {
  pdf: "PDF",
  ppt: "PowerPoint (.pptx)",
  png: "PNG image",
};

export function ExportMenu(props: Props) {
  const [busy, setBusy] = useState<Format | null>(null);

  async function run(format: Format) {
    const el = document.getElementById(props.targetId);
    if (!el) {
      toast.error("Couldn't find the report container to export");
      return;
    }
    setBusy(format);
    try {
      if (format === "pdf") {
        const { exportElementToPdf } = await import("@/lib/exports/pdf");
        await exportElementToPdf(el, props.filename);
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

  return (
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
  );
}
