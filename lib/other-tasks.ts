// "Other tasks" lives in Project.otherTasks (a single String column).
//
// It originally held rich-text HTML from the editor. It now holds a JSON array
// of structured tasks — each with a title, an optional link and optional notes —
// so the report (and the PDF) can render them properly instead of a text blob.
// Both shapes are supported: anything that isn't a JSON array is treated as the
// legacy free-text value, so existing projects keep rendering unchanged.

export type CustomTask = {
  title: string;
  url?: string | null;
  notes?: string | null;
};

export type ParsedOtherTasks = {
  tasks: CustomTask[];
  /** Set only when the stored value is the old free-text/HTML blob. */
  legacyHtml: string | null;
};

export function parseOtherTasksValue(
  raw: string | null | undefined,
): ParsedOtherTasks {
  const s = (raw ?? "").trim();
  if (!s) return { tasks: [], legacyHtml: null };

  if (s.startsWith("[")) {
    try {
      const arr: unknown = JSON.parse(s);
      if (Array.isArray(arr)) {
        const tasks = arr
          .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
          .map((t) => ({
            title: String(t.title ?? "").trim(),
            url: t.url ? String(t.url).trim() : null,
            notes: t.notes ? String(t.notes) : null,
          }))
          .filter((t) => t.title || t.url || t.notes);
        return { tasks, legacyHtml: null };
      }
    } catch {
      // Not valid JSON — fall through and treat it as legacy free text.
    }
  }
  return { tasks: [], legacyHtml: s };
}

/** Serialize for storage. Returns null when there's nothing worth saving. */
export function serializeOtherTasks(tasks: CustomTask[]): string | null {
  const clean = tasks
    .map((t) => ({
      title: (t.title ?? "").trim(),
      url: (t.url ?? "").trim() || null,
      notes: (t.notes ?? "").trim() || null,
    }))
    .filter((t) => t.title || t.url || t.notes);
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
