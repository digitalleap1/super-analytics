"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BACKLINK_CATEGORIES,
  type BacklinkCategory,
  type BacklinkRow,
} from "@/lib/backlinks";

type Props = {
  projectId: string;
  /** The row being edited; null closes the dialog. */
  backlink: BacklinkRow | null;
  onOpenChange: (open: boolean) => void;
};

// Controlled edit dialog — the table opens it with the row to edit. Mirrors the
// Add dialog's form and PATCHes /api/projects/[id]/backlinks.
export function EditBacklinkDialog({
  projectId,
  backlink,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [category, setCategory] =
    useState<BacklinkCategory>("business_listing");
  const [url, setUrl] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  // Re-seed the form each time a different row is opened.
  useEffect(() => {
    if (!backlink) return;
    setCategory(backlink.category);
    setUrl(backlink.url);
    setPlace(backlink.place ?? "");
    setDate(backlink.submittedAt);
    setNotes(backlink.notes ?? "");
  }, [backlink]);

  function save() {
    if (!backlink) return;
    if (!url.trim()) {
      toast.error("Enter a URL");
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      toast.error("URL doesn't look valid");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/backlinks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: backlink.id,
          category,
          url: url.trim(),
          place: place.trim() || null,
          notes: notes.trim() || null,
          submittedAt: date,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not update backlink");
        return;
      }
      toast.success("Backlink updated");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={!!backlink} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit backlink</DialogTitle>
          <DialogDescription>
            Update this backlink&apos;s category, URL, place, date or notes.
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
            <Label htmlFor="bl-edit-url">URL</Label>
            <Input
              id="bl-edit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/your-listing"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bl-edit-place">Place / source</Label>
              <Input
                id="bl-edit-place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g. Yelp · USA · DA 45"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bl-edit-date">Date of submission</Label>
              <input
                id="bl-edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bl-edit-notes">Notes (optional)</Label>
            <Textarea
              id="bl-edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anchor text, follow status, anything else worth remembering"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
