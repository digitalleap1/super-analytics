"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ImportBacklinksDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvFilename, setCsvFilename] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large (max 2MB)");
      return;
    }
    const text = await file.text();
    setCsvText(text);
    setCsvFilename(file.name);
  }

  function importFromCsv() {
    if (!csvText) {
      toast.error("Pick a CSV file first");
      return;
    }
    startTransition(async () => {
      await runImport({ csv: csvText });
    });
  }

  function importFromSheet() {
    if (!sheetUrl.trim()) {
      toast.error("Paste a Google Sheets share URL");
      return;
    }
    startTransition(async () => {
      await runImport({ sheetUrl: sheetUrl.trim() });
    });
  }

  async function runImport(body: { csv?: string; sheetUrl?: string }) {
    const res = await fetch(`/api/projects/${projectId}/backlinks/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Import failed");
      return;
    }
    const skipped: { row: number; reason: string }[] = json.skipped ?? [];
    toast.success(
      `Imported ${json.imported} backlink${json.imported === 1 ? "" : "s"}${skipped.length ? ` (${skipped.length} skipped)` : ""}`,
    );
    if (skipped.length > 0) {
      console.warn("Backlink import — skipped rows:", skipped);
    }
    setOpen(false);
    setCsvText(null);
    setCsvFilename(null);
    setSheetUrl("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import backlinks</DialogTitle>
          <DialogDescription>
            Upload a CSV file, or paste the share link of a public Google
            Sheet. Required column: <code className="font-mono">url</code>.
            Optional:{" "}
            <code className="font-mono">category</code>,{" "}
            <code className="font-mono">place</code>,{" "}
            <code className="font-mono">date</code>,{" "}
            <code className="font-mono">notes</code>. Header naming is flexible
            (e.g. &ldquo;Link Type&rdquo; works as Category).
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="csv">
          <TabsList>
            <TabsTrigger value="csv">CSV file</TabsTrigger>
            <TabsTrigger value="sheet">Google Sheets URL</TabsTrigger>
          </TabsList>
          <TabsContent value="csv" className="space-y-3">
            <div className="rounded-md border border-dashed bg-card/40 p-6 text-center">
              <FileUp className="mx-auto h-6 w-6 text-muted-foreground" />
              <label className="mt-3 inline-block cursor-pointer text-sm text-primary hover:underline">
                {csvFilename
                  ? `Selected: ${csvFilename}`
                  : "Click to pick a CSV file"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Max 2MB. Export from Google Sheets via File → Download → CSV.
              </p>
            </div>
            <DialogFooter className="px-0">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={importFromCsv}
                disabled={isPending || !csvText}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Import CSV
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="sheet" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sheet-url">Google Sheets share URL</Label>
              <Input
                id="sheet-url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="text-xs text-muted-foreground">
                Share the sheet as <strong>Anyone with the link can view</strong>{" "}
                first. We fetch the public CSV export of the first tab.
              </p>
            </div>
            <DialogFooter className="px-0">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={importFromSheet}
                disabled={isPending || !sheetUrl.trim()}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Import sheet
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
