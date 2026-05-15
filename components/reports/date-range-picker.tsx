"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatRangeLabel,
  parseRangeFromSearchParams,
  PRESET_LABELS,
  presetRange,
  type RangePreset,
  ymd,
} from "@/lib/date-ranges";

const PRESETS: RangePreset[] = [
  "last7",
  "last28",
  "last90",
  "thisMonth",
  "lastMonth",
  "custom",
];

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const current = parseRangeFromSearchParams({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    preset: params.get("preset") ?? undefined,
  });

  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<RangePreset>(current.preset);
  const [from, setFrom] = useState(ymd(current.range.from));
  const [to, setTo] = useState(ymd(current.range.to));
  const [isPending, startTransition] = useTransition();

  function applyPreset(p: RangePreset) {
    setPreset(p);
    if (p !== "custom") {
      const r = presetRange(p);
      setFrom(ymd(r.from));
      setTo(ymd(r.to));
    }
  }

  function apply() {
    const next = new URLSearchParams(params.toString());
    next.set("preset", preset);
    if (preset === "custom") {
      next.set("from", from);
      next.set("to", to);
    } else {
      const r = presetRange(preset);
      next.set("from", ymd(r.from));
      next.set("to", ymd(r.to));
    }
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
      setOpen(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          {preset === "custom"
            ? formatRangeLabel(current.range)
            : PRESET_LABELS[preset]}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] space-y-3">
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyPreset(p)}
              className={cn(
                "rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
                preset === p
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-muted-foreground">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Range: {formatRangeLabel(current.range)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={apply} disabled={isPending}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
