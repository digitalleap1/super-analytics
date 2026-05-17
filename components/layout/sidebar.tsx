import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

type SidebarProps = {
  user: { name?: string | null; email?: string | null; image?: string | null };
};

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="relative h-16 overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <Link
          href="/dashboard"
          className="relative flex h-full items-center gap-2 px-5 font-semibold"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span>SEO Dashboard</span>
        </Link>
      </div>
      <div className="py-4">
        <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation
        </p>
        <SidebarNav />
      </div>
      <div className="mt-auto border-t p-3">
        <UserMenu name={user.name} email={user.email} image={user.image} />
      </div>
    </aside>
  );
}
