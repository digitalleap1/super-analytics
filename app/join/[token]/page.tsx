import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";

import { auth } from "@/lib/auth";
import { lookupInvite, redeemInvite } from "@/lib/invites";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Join workspace — SEO Dashboard",
};

function MessageCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
        {cta ? <div className="pt-2">{cta}</div> : null}
      </div>
    </div>
  );
}

export default async function JoinPage({
  params,
}: {
  params: { token: string };
}) {
  const lookup = await lookupInvite(params.token);

  if (!lookup.ok) {
    const message =
      lookup.reason === "expired"
        ? "This invite has expired."
        : lookup.reason === "used"
          ? "This invite has already been used."
          : "We couldn't find that invite.";
    return (
      <MessageCard
        title="Invite unavailable"
        body={message}
        cta={
          <Button asChild variant="outline">
            <Link href="/login">Go to sign in</Link>
          </Button>
        }
      />
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    // Send them to register; preserve the invite token so we can redeem after.
    const next = `/api/auth/join?token=${encodeURIComponent(params.token)}`;
    return (
      <MessageCard
        title={`Join "${lookup.invite.workspaceName}"`}
        body="You'll need an account first. Create one or sign in — we'll add you to the workspace right after."
        cta={
          <div className="flex justify-center gap-2">
            <Button asChild>
              <Link href={`/register?next=${encodeURIComponent(next)}`}>
                Create account
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/login?from=${encodeURIComponent(next)}`}>
                Sign in
              </Link>
            </Button>
          </div>
        }
      />
    );
  }

  // Already signed in — redeem the invite now and redirect.
  const result = await redeemInvite(params.token, session.user.id);
  if (!result.ok) {
    return (
      <MessageCard
        title="Could not join"
        body="The invite couldn't be redeemed. It may have just expired or been used."
        cta={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    );
  }

  redirect(`/dashboard?joined=${encodeURIComponent(lookup.invite.workspaceName)}`);
}
