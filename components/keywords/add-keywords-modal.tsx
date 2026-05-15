"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRIES = [
  { code: "usa", label: "United States" },
  { code: "gbr", label: "United Kingdom" },
  { code: "can", label: "Canada" },
  { code: "aus", label: "Australia" },
  { code: "ind", label: "India" },
  { code: "deu", label: "Germany" },
  { code: "fra", label: "France" },
];

export function AddKeywordsModal({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [country, setCountry] = useState("usa");
  const [device, setDevice] = useState<"all" | "desktop" | "mobile" | "tablet">(
    "all",
  );
  const [tag, setTag] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    const queries = keywords
      .split(/\r?\n/)
      .map((q) => q.trim())
      .filter(Boolean);
    if (queries.length === 0) {
      toast.error("Enter at least one keyword");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries,
          country,
          device,
          tag: tag.trim() || null,
        }),
      });
      if (!res.ok) {
        toast.error("Could not add keywords");
        return;
      }
      const body = (await res.json()) as { added: number; requested: number };
      toast.success(
        body.added === body.requested
          ? `Added ${body.added} keyword${body.added === 1 ? "" : "s"}`
          : `Added ${body.added} of ${body.requested} (others were duplicates)`,
      );
      setKeywords("");
      setTag("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add keywords
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add keywords</DialogTitle>
          <DialogDescription>
            Paste keywords one per line. Choose the country and device to track
            them under.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords</Label>
            <Textarea
              id="keywords"
              rows={8}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={"buy widgets\nbest widget brand"}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Device</Label>
              <Select
                value={device}
                onValueChange={(v) =>
                  setDevice(v as "all" | "desktop" | "mobile" | "tablet")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag">Tag</Label>
              <Input
                id="tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Add keywords
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
