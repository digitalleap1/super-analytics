import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

type SidebarProps = {
  user: { name?: string | null; email?: string | null; image?: string | null };
};

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span>SEO Dashboard</span>
        </Link>
      </div>
      <div className="py-4">
        <SidebarNav />
      </div>
      <div className="mt-auto border-t p-3">
        <UserMenu name={user.name} email={user.email} image={user.image} />
      </div>
    </aside>
  );
}
