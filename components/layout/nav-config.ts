import { LayoutDashboard, FolderKanban, Settings } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard", icon: FolderKanban },
  { label: "Settings", href: "/settings", icon: Settings },
];
