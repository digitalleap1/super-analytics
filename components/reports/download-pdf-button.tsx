"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  filename: string;
  targetId: string;
};

export function DownloadPdfButton({ filename, targetId }: Props) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const target = document.getElementById(targetId);
      if (!target) {
        toast.error("Report container not found");
        return;
      }
      // html2pdf.js pulls in a fair amount of code (html2canvas + jsPDF) — load
      // it lazily so the main bundle stays small.
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
          margin: [10, 10, 12, 10],
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(target)
        .save();
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={download}
      disabled={busy}
      className="gap-2 print:hidden"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Download PDF
    </Button>
  );
}
