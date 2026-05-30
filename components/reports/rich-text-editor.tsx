"use client";

import { useEffect } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

// Lightweight rich-text editor used in the Analysis + Other tasks sections.
// Stores HTML so it round-trips cleanly through saved-report snapshots.
export function RichTextEditor({ value, onChange, placeholder, disabled }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
      }),
    ],
    content: value || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap min-h-[160px] w-full rounded-b-md border border-t-0 bg-background px-3 py-2.5 text-sm leading-relaxed focus:outline-none",
          "prose prose-sm max-w-none dark:prose-invert",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_p]:my-1 [&_li]:my-0.5",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        ),
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      // TipTap returns "<p></p>" when empty — normalise that to "" so save
      // logic can detect emptiness.
      onChange(editor.isEmpty ? "" : html);
    },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. cancel edit reverts the draft).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== (value || "")) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="min-h-[200px] animate-pulse rounded-md border bg-muted/20" />
    );
  }

  const toolbarBtn = (active: boolean) =>
    cn(
      "h-7 w-7 p-0 text-muted-foreground hover:text-foreground",
      active && "bg-primary/10 text-primary",
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 bg-muted/40 p-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={toolbarBtn(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          aria-label="Bold"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={toolbarBtn(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          aria-label="Italic"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={toolbarBtn(editor.isActive("strike"))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          aria-label="Strikethrough"
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={toolbarBtn(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          aria-label="Bulleted list"
          title="Bulleted list"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={toolbarBtn(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          aria-label="Numbered list"
          title="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={toolbarBtn(editor.isActive("blockquote"))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          aria-label="Quote"
          title="Quote"
        >
          <Quote className="h-3.5 w-3.5" />
        </Button>
      </div>
      <EditorContent editor={editor} data-placeholder={placeholder} />
    </div>
  );
}

// Read-only rendering of the rich text. Wraps the HTML in the same prose styles
// as the editor so the saved/share view looks identical to live edit mode.
export function RichTextDisplay({ html }: { html: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none rounded-md border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed dark:prose-invert",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_p]:my-1 [&_li]:my-0.5",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
