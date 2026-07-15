// "Other tasks" lives in Project.otherTasks (a single String column).
//
// Shape: a list of CATEGORIES (e.g. "On-Page Tasks", "Google Business Profile"),
// each holding multiple TASKS — a name plus an optional link and notes:
//
//   [{ "title": "On-Page Tasks", "tasks": [
//        { "title": "Keyword Ranking", "url": "https://…", "notes": "" }, … ]}]
//
// Two older shapes are still read so nothing breaks:
//   • a flat task array  [{title,url,notes}, …]  → becomes one untitled category
//   • the original rich-text/HTML blob            → returned as `legacyHtml`

export type CustomTask = {
  title: string;
  url?: string | null;
  notes?: string | null;
};

export type TaskGroup = {
  /** The main category, e.g. "On-Page Tasks". May be empty (untitled group). */
  title: string;
  tasks: CustomTask[];
};

export type ParsedOtherTasks = {
  groups: TaskGroup[];
  /** Set only when the stored value is the old free-text/HTML blob. */
  legacyHtml: string | null;
};

function normalizeTasks(v: unknown): CustomTask[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t) => ({
      title: String(t.title ?? "").trim(),
      url: t.url ? String(t.url).trim() : null,
      notes: t.notes ? String(t.notes) : null,
    }))
    .filter((t) => t.title || t.url || t.notes);
}

export function parseOtherTasksValue(
  raw: string | null | undefined,
): ParsedOtherTasks {
  const s = (raw ?? "").trim();
  if (!s) return { groups: [], legacyHtml: null };

  if (s.startsWith("[")) {
    try {
      const arr: unknown = JSON.parse(s);
      if (Array.isArray(arr)) {
        // Current shape: categories, each with a nested `tasks` array.
        const isGrouped = arr.some(
          (g) =>
            !!g &&
            typeof g === "object" &&
            Array.isArray((g as Record<string, unknown>).tasks),
        );
        if (isGrouped) {
          const groups = arr
            .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
            .map((g) => ({
              title: String(g.title ?? "").trim(),
              tasks: normalizeTasks(g.tasks),
            }))
            .filter((g) => g.title || g.tasks.length);
          return { groups, legacyHtml: null };
        }
        // Older flat shape — treat the whole list as one untitled category.
        const tasks = normalizeTasks(arr);
        return {
          groups: tasks.length ? [{ title: "", tasks }] : [],
          legacyHtml: null,
        };
      }
    } catch {
      // Not valid JSON — fall through and treat it as legacy free text.
    }
  }
  return { groups: [], legacyHtml: s };
}

/** Serialize for storage. Returns null when there's nothing worth saving. */
export function serializeOtherTasks(groups: TaskGroup[]): string | null {
  const clean = groups
    .map((g) => ({
      title: (g.title ?? "").trim(),
      tasks: (g.tasks ?? [])
        .map((t) => ({
          title: (t.title ?? "").trim(),
          url: (t.url ?? "").trim() || null,
          notes: (t.notes ?? "").trim() || null,
        }))
        .filter((t) => t.title || t.url || t.notes),
    }))
    .filter((g) => g.title || g.tasks.length);
  return clean.length ? JSON.stringify(clean) : null;
}

/** Users paste "example.com/x" as often as a full URL — make it clickable. */
export function taskHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, "")}`;
}

/** Strip tags/entities so a legacy HTML blob can seed a task's notes field. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|ul|ol|tr)\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
