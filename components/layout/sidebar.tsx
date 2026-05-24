import Link from "next/link";
import { TrendingUp } from "lucide-react";

import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

type SidebarProps = {
  user: { name?: string | null; email?: string | null; image?: string | null };
  workspaceName: string;
  isAdmin: boolean;
};

export function Sidebar({ user, workspaceName, isAdmin }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="relative h-20 overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <Link
          href="/dashboard"
          className="relative flex h-full items-center gap-2.5 px-5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight leading-tight">
              Super Analytics
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {workspaceName}
            </p>
          </div>
        </Link>
      </div>
      <div className="py-4">
        <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation
        </p>
        <SidebarNav isAdmin={isAdmin} />
      </div>
      <div className="mt-auto border-t p-3">
        <UserMenu name={user.name} email={user.email} image={user.image} />
      </div>
    </aside>
  );
}
