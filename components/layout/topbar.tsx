import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";

type TopBarProps = {
  user: { name?: string | null; email?: string | null; image?: string | null };
  isAdmin?: boolean;
  children?: React.ReactNode;
};

export function TopBar({ user, isAdmin = false, children }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <MobileNav user={user} isAdmin={isAdmin} />
      <div className="flex-1">{children}</div>
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-5 w-5" />
      </Button>
    </header>
  );
}
