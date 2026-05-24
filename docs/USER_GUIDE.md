# Super Analytics — User Guide

A 10-minute walkthrough for first-time users of the Super Analytics SEO reporting dashboard.

**Production URL:** https://super-analytics.vercel.app

---

## What is Super Analytics?

Super Analytics is a multi-client SEO reporting dashboard. It pulls live data from:

- **Google Search Console** — clicks, impressions, queries, pages, average position
- **Google Analytics 4** — sessions, users, engagement, conversions, channels
- **DataForSEO** — daily keyword rank tracking by country / device
- **Manual entries** — backlinks you build for the client

…and stitches it into a single client-facing report you can save, share publicly, or export as PDF / PPT / PNG.

---

## 1. Create your account

1. Open https://super-analytics.vercel.app
2. Click **Register**
3. Enter your name, email, and a password (8+ characters)
4. You're signed in and dropped on the **Dashboard**

Already have an account? Click **Sign in** — credentials or **Sign in with Google**.

---

## 2. Understand the layout

After signing in, the screen has three areas:

| Area | What lives here |
|------|-----------------|
| **Sidebar (left)** | Dashboard, Projects, Templates, Users (admin only), Settings |
| **Top bar** | Logo (Super Analytics), workspace name, your account menu |
| **Main panel** | Whatever you clicked — dashboard summary, project list, a specific report, etc. |

On mobile, the sidebar collapses into a hamburger menu (☰ icon top-left).

---

## 3. Set up a Workspace

A **workspace** is one agency / company. All projects, templates and team members live inside it.

- On first signup, a default workspace is created for you automatically
- To rename: **Settings → Workspace**
- To create more: **Settings → Workspaces → New Workspace**
- You'll have access to switch between workspaces from the top-bar workspace picker

---

## 4. Add your first Project

A **project** = one client / website.

1. Sidebar → **Projects** → **+ New Project**
2. Fill in:
   - **Name** — what you want to call this client (e.g. "Acme Plumbing")
   - **Domain** — the bare domain (e.g. `acmeplumbing.com`)
   - **Logo URL** *(optional)* — client logo for the report header
3. Click **Create**

You'll land on the project page — it shows **sample data** at first because nothing is connected yet. That's expected.

---

## 5. Connect Google (Search Console + GA4)

This is the most important step. Without it, all numbers are fake.

1. On the project page, click the **Settings** tab (or "Connect Google" prompt)
2. Click **Connect Google** → choose the client's Google account → grant permissions
3. After OAuth, you'll see two dropdowns:
   - **Search Console site** → pick the client's verified property (e.g. `sc-domain:acmeplumbing.com`)
   - **GA4 property** → pick the client's analytics property (e.g. `properties/123456789`)
4. Click **Save**

> ⚠️ **Important**: You must connect using the **client's** Google account, not yours — they're the one who owns Search Console and GA4 access.

Refresh the project page — real numbers should appear within a few seconds.

If you still see "Showing sample data," the connection didn't save. Re-open Settings and confirm both dropdowns show a selected value.

---

## 6. Add Keywords for rank tracking

This is separate from GSC's average-position data — these are dedicated keyword ranks updated daily.

1. Project page → **Keywords** tab → **+ Add Keywords**
2. Paste keywords one per line (e.g.):
   ```
   emergency plumber boston
   24/7 plumbing
   leak repair near me
   ```
3. Set the **Country** (default USA) and **Device** (all / mobile / desktop)
4. Optional: add a **tag** to group keywords (e.g. "Service pages")
5. Click **Add**

The first time, rankings populate within a few minutes (DataForSEO API call). Going forward, ranks refresh **daily at 8:30 AM IST** via the automatic cron job.

---

## 7. Add Backlinks (manual log)

For tracking outreach / off-page work you do.

1. Project page → **Backlinks** tab → **+ Add Backlink**
2. Fill:
   - **Category** — Business Listing, Profile Creation, Social Bookmarking, Microblog, Third-party Blog, Website Blog, Other
   - **URL** — the page where the backlink lives
   - **Place** *(optional)* — site name (e.g. "Yelp", "Reddit")
   - **Notes** *(optional)*
   - **Date** — when the backlink went live
3. Click **Save**

The Backlinks tab shows a pie chart by category + monthly trend.

---

## 8. View & customize the Report

The main project page **IS** the report. By default it shows:

- **KPI cards** — Clicks, Impressions, CTR, Average Position, Sessions, Users
- **Trend charts** — Clicks/Impressions over time, GA4 sessions
- **Top Queries** + **Top Pages** tables (from GSC)
- **Top Channels** table (from GA4)
- **Keyword rankings** with position history
- **Backlinks** list + breakdown

### Date range
Top-right of the report → **Date picker** → choose Last 7 / 28 / 90 days, This Month, Last Month, or Custom range. Compare-to-previous-period is on by default.

### Edit the layout
Click the **Edit** button (pencil icon) on any section to:
- Hide/show charts, tables, KPIs
- Reorder sections
- Change titles
- Pick which KPIs to display

Changes save automatically and apply to **this project only**.

### Save as a template
**Settings → Templates** lets you save a customized layout to reuse across projects.

---

## 9. Save & Share reports

### Save a snapshot
Top-right of the report → **Save Report**:
- Give it a name (e.g. "May 2026 Monthly")
- It freezes all current data + layout
- Saved reports live under the project's **Reports** tab

### Share publicly
Open any saved report → **Share** button → toggles on a public URL:
```
https://super-analytics.vercel.app/r/<random-token>
```
Anyone with the link can view (read-only, no login). Re-toggle to revoke.

---

## 10. Export

Top-right of any report → **Export** menu:

| Format | Use when |
|--------|----------|
| **PDF** | Email to clients, archive, print |
| **PPT** | Present in a meeting / convert to Google Slides |
| **PNG** | Drop a single section into Slack / WhatsApp / email |

Individual tables (Keywords, Top Queries, Top Pages) also have their own download buttons.

---

## 11. Invite teammates

1. **Settings → Team** → **Invite Member**
2. Enter email + role:
   - **Owner** — full control, can delete workspace
   - **Admin** — manage all projects + users
   - **Member** — only sees projects they're added to
   - **Viewer** — read-only access
3. They get an invite link → register → land in your workspace

To restrict a regular Member to specific projects: open the project → **Settings → Members** → add them.

---

## 12. Daily / weekly workflow

**Daily (automated)** — keyword ranks refresh at 8:30 AM IST. Nothing for you to do.

**Weekly** — log new backlinks built that week (Project → Backlinks).

**Monthly** — for each client:
1. Open project
2. Set date range to **Last Month**
3. Click **Save Report** → name it (e.g. "May 2026 Monthly")
4. Click **Share** → copy public URL
5. Send the URL or **Export PDF** and email it

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Showing sample data" banner | Project's Google connection wasn't saved. Re-open Settings, pick the GSC site + GA4 property again. |
| Keywords show "—" for position | First fetch takes a few minutes after adding. Wait, refresh. |
| Numbers look off vs Google's UI | GSC has a 2–3 day data lag. The most recent dates may show zeros until Google publishes them. |
| Can't sign in with Google | Make sure you registered with the same email Google uses. Or use email/password instead. |
| Saved report looks different from live | Saved reports are **snapshots** — they preserve the data as of save time. Live reports update with new data. |
| Locked out / forgot password | Ask an admin to reset it: **Users → your row → Reset Password**. |

---

## Need help?

- **Build issues / bugs** → contact your admin
- **Google connection issues** → confirm the client granted both Search Console + GA4 read permissions during OAuth
- **DataForSEO billing** → check usage in the DataForSEO dashboard (each rank check = ~1 credit)

---

*Document version: May 2026 — Super Analytics*
