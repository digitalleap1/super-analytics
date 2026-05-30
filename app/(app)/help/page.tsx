import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Download,
  HelpCircle,
  KeyRound,
  Link2,
  LineChart,
  Plug,
  Save,
  Share2,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Help — Super Analytics",
};

type Section = {
  icon: typeof BookOpen;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    icon: BookOpen,
    title: "1. What is Super Analytics?",
    body: (
      <div className="space-y-2">
        <p>
          A multi-client SEO reporting dashboard. It stitches live data from
          Google Search Console, GA4, and DataForSEO into a single client-facing
          report you can save, share publicly, or export as PDF / PPT / PNG.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Search Console</strong> — clicks, impressions, queries,
            pages, average position
          </li>
          <li>
            <strong>GA4</strong> — sessions, users, engagement, conversions,
            channels
          </li>
          <li>
            <strong>DataForSEO</strong> — daily keyword rank tracking by country
            and device
          </li>
          <li>
            <strong>Manual entries</strong> — backlinks you build for the client
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: CheckCircle2,
    title: "2. Layout at a glance",
    body: (
      <div className="space-y-2">
        <p>Three areas after signing in:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Sidebar (left)</strong> — Dashboard, Projects, Templates,
            Users (admin only), Help, Settings
          </li>
          <li>
            <strong>Top bar</strong> — workspace name, your account menu
          </li>
          <li>
            <strong>Main panel</strong> — whatever you clicked
          </li>
        </ul>
        <p>On mobile, the sidebar collapses into a hamburger menu (☰).</p>
      </div>
    ),
  },
  {
    icon: Users,
    title: "3. Workspace",
    body: (
      <div className="space-y-2">
        <p>
          A <strong>workspace</strong> is one agency or company. All projects,
          templates and team members live inside it. A default workspace is
          created on signup. Rename it via <strong>Settings → Workspace</strong>.
        </p>
      </div>
    ),
  },
  {
    icon: BookOpen,
    title: "4. Add your first Project",
    body: (
      <div className="space-y-2">
        <p>A <strong>project</strong> = one client / website.</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Sidebar → <strong>Projects</strong> → <strong>+ New Project</strong></li>
          <li>Name (e.g. &ldquo;Acme Plumbing&rdquo;), bare domain, optional logo URL</li>
          <li>Click <strong>Create</strong></li>
        </ol>
        <p className="text-muted-foreground">
          The new project shows sample data at first because Google isn&apos;t
          connected yet — that&apos;s expected.
        </p>
      </div>
    ),
  },
  {
    icon: Plug,
    title: "5. Connect Google (GSC + GA4)",
    body: (
      <div className="space-y-2">
        <p>
          This is the most important step. Without it, all numbers are fake.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Project page → <strong>Settings</strong> tab</li>
          <li>
            Click <strong>Connect Google</strong> → choose the{" "}
            <strong>client&apos;s</strong> Google account → grant permissions
          </li>
          <li>
            Pick the <strong>Search Console site</strong> and{" "}
            <strong>GA4 property</strong> from the dropdowns
          </li>
          <li>
            Click <strong>Save</strong>
          </li>
        </ol>
        <Card className="border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          ⚠️ Connect using the <strong>client&apos;s</strong> Google account, not
          yours — they own the GSC and GA4 access.
        </Card>
      </div>
    ),
  },
  {
    icon: KeyRound,
    title: "6. Add Keywords (rank tracking)",
    body: (
      <div className="space-y-2">
        <p>
          Separate from GSC&apos;s average-position data — dedicated keyword
          ranks refreshed daily by DataForSEO.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Project → <strong>Keywords</strong> tab → <strong>+ Add Keywords</strong></li>
          <li>Paste keywords one per line</li>
          <li>Set country and device (all / mobile / desktop)</li>
          <li>Optional: tag them (e.g. &ldquo;Service pages&rdquo;)</li>
        </ol>
        <p className="text-muted-foreground">
          First fetch takes a few minutes. After that, ranks refresh{" "}
          <strong>daily at 8:30 AM IST</strong> automatically.
        </p>
      </div>
    ),
  },
  {
    icon: Link2,
    title: "7. Add Backlinks (manual log)",
    body: (
      <div className="space-y-2">
        <p>For tracking outreach / off-page work you do.</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Project → <strong>Backlinks</strong> tab → <strong>+ Add Backlink</strong></li>
          <li>Pick a category (Business Listing, Profile, Social Bookmark, etc.)</li>
          <li>Enter URL, place, notes, and the date the backlink went live</li>
        </ol>
        <p className="text-muted-foreground">
          The tab shows a pie chart by category + monthly trend.
        </p>
      </div>
    ),
  },
  {
    icon: LineChart,
    title: "8. View &amp; customize the Report",
    body: (
      <div className="space-y-2">
        <p>The project page <strong>is</strong> the report. By default:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>KPI cards (clicks, impressions, CTR, position, sessions, users)</li>
          <li>Trend charts (clicks/impressions, GA4 sessions)</li>
          <li>Top Queries + Top Pages (GSC)</li>
          <li>Top Channels (GA4)</li>
          <li>Keyword rankings with position history</li>
          <li>Backlinks list + breakdown</li>
        </ul>
        <p>
          <strong>Date picker</strong> (top right): Last 7 / 28 / 90, This
          Month, Last Month, or custom range. Compare-to-previous is on by
          default.
        </p>
        <p>
          <strong>Edit mode</strong>: click the pencil icon to hide/show
          sections, reorder them, or change titles. Saved per-project.
        </p>
        <p>
          <strong>Templates</strong>: save a customized layout to reuse across
          projects via <strong>Settings → Templates</strong>.
        </p>
      </div>
    ),
  },
  {
    icon: Save,
    title: "9. Save &amp; Share reports",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Save snapshot</strong>: top-right of the report →{" "}
          <strong>Save Report</strong>. Freezes all current data + layout.
          Saved ones live under the project&apos;s <strong>Reports</strong> tab.
        </p>
        <p>
          <strong>Share publicly</strong>: open a saved report →{" "}
          <strong>Share</strong> → toggles on a public URL like{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            /r/&lt;random-token&gt;
          </code>
          . Anyone with the link can view (read-only, no login). Toggle off to
          revoke.
        </p>
      </div>
    ),
  },
  {
    icon: Download,
    title: "10. Export",
    body: (
      <div className="space-y-2">
        <p>
          Top-right of any report → <strong>Export</strong> menu.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>PDF</strong> — email to clients, archive, print
          </li>
          <li>
            <strong>PPT</strong> — present in a meeting or upload to Google
            Slides
          </li>
          <li>
            <strong>PNG</strong> — drop a single section into Slack / WhatsApp /
            email
          </li>
        </ul>
        <p className="text-muted-foreground">
          Individual tables (Keywords, Top Queries, Top Pages) also have their
          own download buttons.
        </p>
      </div>
    ),
  },
  {
    icon: Share2,
    title: "11. Invite teammates",
    body: (
      <div className="space-y-2">
        <ol className="list-decimal space-y-1 pl-5">
          <li><strong>Settings → Team</strong> → <strong>Invite Member</strong></li>
          <li>Enter email + role:</li>
        </ol>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Owner</strong> — full control, can delete workspace</li>
          <li><strong>Admin</strong> — manage all projects + users</li>
          <li><strong>Member</strong> — only sees projects they&apos;re added to</li>
          <li><strong>Viewer</strong> — read-only</li>
        </ul>
        <p className="text-muted-foreground">
          To restrict a Member to specific projects, open the project →{" "}
          <strong>Settings → Members</strong>.
        </p>
      </div>
    ),
  },
  {
    icon: HelpCircle,
    title: "12. Daily / Weekly / Monthly workflow",
    body: (
      <div className="space-y-2">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Daily (automated)</strong> — keyword ranks refresh at 8:30
            AM IST. Nothing for you to do.
          </li>
          <li>
            <strong>Weekly</strong> — log new backlinks built that week.
          </li>
          <li>
            <strong>Monthly</strong> — for each client: set date range to{" "}
            <em>Last Month</em> → Save Report → Share (public link) or Export
            PDF and email.
          </li>
        </ul>
      </div>
    ),
  },
];

const TROUBLESHOOTING: { problem: string; fix: string }[] = [
  {
    problem: "&ldquo;Showing sample data&rdquo; banner",
    fix: "The project&apos;s Google connection wasn&apos;t saved. Re-open Settings and pick the GSC site + GA4 property again.",
  },
  {
    problem: "Keywords show &mdash; for position",
    fix: "First fetch takes a few minutes after adding. Wait, then refresh.",
  },
  {
    problem: "Numbers look off vs Google&apos;s UI",
    fix: "GSC has a 2&ndash;3 day data lag. The most recent dates may show zeros until Google publishes them.",
  },
  {
    problem: "Can&apos;t sign in with Google",
    fix: "Make sure you registered with the same email Google uses. Or use email + password instead.",
  },
  {
    problem: "Saved report looks different from live",
    fix: "Past reports are snapshots — they preserve the data as of save time. Live reports update with new data.",
  },
  {
    problem: "Locked out / forgot password",
    fix: "Ask an admin to reset it: Users → your row → Reset Password.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-2">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HelpCircle className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Help &amp; Getting Started</h1>
        </div>
        <p className="text-muted-foreground">
          A 10-minute walkthrough for first-time users. Built for SEO agencies
          managing multiple clients.
        </p>
      </header>

      <Card className="bg-primary/5 p-4 text-sm">
        <p className="font-medium">Quick path for a brand-new account:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Create a workspace (auto on signup)</li>
          <li>Add your first project (name + domain)</li>
          <li>Connect the client&apos;s Google (GSC + GA4)</li>
          <li>Add keywords for rank tracking</li>
          <li>Generate a report &mdash; Save it &mdash; Share the link</li>
        </ol>
      </Card>

      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">{section.title}</h2>
              </div>
              <div className="text-sm leading-relaxed text-foreground/90">
                {section.body}
              </div>
            </Card>
          );
        })}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Troubleshooting</h2>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Problem</th>
                <th className="px-4 py-2 font-medium">Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {TROUBLESHOOTING.map((row, i) => (
                <tr key={i}>
                  <td
                    className="px-4 py-2 font-medium"
                    dangerouslySetInnerHTML={{ __html: row.problem }}
                  />
                  <td
                    className="px-4 py-2 text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: row.fix }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
        <p>
          Need more help? Contact your workspace admin or{" "}
          <Link href="/settings" className="text-primary hover:underline">
            check your settings
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
