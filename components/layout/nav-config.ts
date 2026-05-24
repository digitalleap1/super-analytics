import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  // True = render only when the current user is an admin of their workspace.
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Templates", href: "/settings/templates", icon: FileText },
  { label: "Users", href: "/settings/users", icon: ShieldCheck, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];
