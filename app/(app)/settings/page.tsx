import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { GoogleConnect } from "@/components/settings/google-connect";

export const metadata = {
  title: "Settings — SEO Dashboard",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const googleAccount = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: { providerAccountId: true, scope: true, expires_at: true },
  });

  const connectedEmail = googleAccount ? session.user.email ?? null : null;
  const justConnected = searchParams.google === "connected";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and connected Google access.
        </p>
      </div>

      {justConnected && googleAccount ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
          Google connected. Live data will appear once you wire each project
          to a Search Console site and a GA4 property.
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Profile
        </h2>
        <div className="rounded-lg border bg-card p-4">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{session.user.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-mono">{session.user.email ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Connected accounts
        </h2>
        <GoogleConnect
          connectedEmail={connectedEmail}
          currentUserEmail={session.user.email}
        />
        {googleAccount?.scope ? (
          <p className="text-xs text-muted-foreground">
            Granted scopes:{" "}
            <span className="font-mono">{googleAccount.scope}</span>
          </p>
        ) : null}
      </section>
    </div>
  );
}
