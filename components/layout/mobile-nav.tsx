"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

type MobileNavProps = {
  user: { name?: string | null; email?: string | null; image?: string | null };
  isAdmin?: boolean;
};

export function MobileNav({ user, isAdmin = false }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-16 items-center px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
            onClick={() => setOpen(false)}
          >
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>SEO Dashboard</span>
          </Link>
        </div>
        <div className="py-4">
          <SidebarNav
            onNavigate={() => setOpen(false)}
            isAdmin={isAdmin}
          />
        </div>
        <div className="mt-auto border-t p-3">
          <UserMenu name={user.name} email={user.email} image={user.image} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
