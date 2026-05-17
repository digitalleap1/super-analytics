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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BACKLINK_CATEGORIES, type BacklinkCategory } from "@/lib/backlinks";
import { ymd } from "@/lib/date-ranges";

export function AddBacklinkDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<BacklinkCategory>("business_listing");
  const [url, setUrl] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState(ymd(new Date()));
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setCategory("business_listing");
    setUrl("");
    setPlace("");
    setNotes("");
    setDate(ymd(new Date()));
  }

  function save() {
    if (!url.trim()) {
      toast.error("Enter a URL");
      return;
    }
    try {
      // basic URL sanity check
      new URL(url.trim());
    } catch {
      toast.error("URL doesn't look valid");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/backlinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          url: url.trim(),
          place: place.trim() || null,
          notes: notes.trim() || null,
          submittedAt: date,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not add backlink");
        return;
      }
      toast.success("Backlink added");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add backlink
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add backlink</DialogTitle>
          <DialogDescription>
            Manually log a backlink you built or earned. For bulk entry, use
            the Import button.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as BacklinkCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BACKLINK_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bl-url">URL</Label>
            <Input
              id="bl-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/your-listing"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bl-place">Place / source</Label>
              <Input
                id="bl-place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g. Yelp · USA · DA 45"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bl-date">Date of submission</Label>
              <input
                id="bl-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bl-notes">Notes (optional)</Label>
            <Textarea
              id="bl-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anchor text, follow status, anything else worth remembering"
            />
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
            Add backlink
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
