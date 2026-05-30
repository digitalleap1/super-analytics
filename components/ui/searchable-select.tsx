"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  helper?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  disabled?: boolean;
  // Show this as the very first (resettable) option, e.g. "Not connected".
  noneOption?: { value: string; label: string };
};

// Combobox: trigger button shows the selected option, popover holds a
// type-to-filter search and a scrollable list. Behaves like shadcn-ui's
// Command but built on the components actually in this project.
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Pick one...",
  loading = false,
  loadingMessage = "Loading…",
  emptyMessage = "No matches",
  disabled = false,
  noneOption,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      return (
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.helper?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Autofocus the search input when popover opens.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
    }
  }, [open]);

  const selected =
    noneOption && value === noneOption.value
      ? { value: noneOption.value, label: noneOption.label }
      : options.find((o) => o.value === value);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = filtered[highlight];
      if (hit) pick(hit.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between text-left font-normal"
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[280px] p-0"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type to search…"
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {noneOption && !query ? (
            <button
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm",
                value === noneOption.value
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
              onClick={() => pick(noneOption.value)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === noneOption.value ? "opacity-100" : "opacity-0",
                )}
              />
              {noneOption.label}
            </button>
          ) : null}
          {loading ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              {loadingMessage}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            filtered.map((o, i) => {
              const isHi = i === highlight;
              const isSel = o.value === value;
              return (
                <button
                  type="button"
                  key={o.value}
                  className={cn(
                    "flex w-full cursor-pointer items-start rounded-sm px-2 py-1.5 text-left text-sm",
                    isHi && "bg-accent text-accent-foreground",
                    isSel && !isHi && "bg-accent/40",
                  )}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(o.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 mt-0.5 h-4 w-4 shrink-0",
                      isSel ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.helper ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {o.helper}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
