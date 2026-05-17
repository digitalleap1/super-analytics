"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-config";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard" || pathname.startsWith("/projects")
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {/* Active-state accent bar on the left edge */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary transition-opacity",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                isActive ? "text-primary" : "text-muted-foreground",
                "group-hover:scale-110",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
