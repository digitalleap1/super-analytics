import { auth } from "@/lib/auth";

export const metadata = {
  title: "Dashboard — SEO Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your projects will appear here. Phase 3 wires up the projects overview.
        </p>
      </div>
    </div>
  );
}
