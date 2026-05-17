"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_TEMPLATE_CONFIG,
  SECTION_LABELS,
  type Density,
  type KpiColumns,
  type ReportTemplateConfig,
  type SectionKey,
  type TableLimit,
} from "@/lib/templates";

type Props = {
  mode: "create" | "edit";
  templateId?: string;
  initial: {
    name: string;
    description: string | null;
    isDefault: boolean;
    config: ReportTemplateConfig;
  };
};

export function TemplateEditor({ mode, templateId, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [config, setConfig] = useState<ReportTemplateConfig>(initial.config);

  function setSection(key: SectionKey, value: boolean) {
    setConfig((c) => ({
      ...c,
      sections: { ...c.sections, [key]: value },
    }));
  }

  function setLayout<K extends keyof ReportTemplateConfig["layout"]>(
    key: K,
    value: ReportTemplateConfig["layout"][K],
  ) {
    setConfig((c) => ({
      ...c,
      layout: { ...c.layout, [key]: value },
    }));
  }

  function setBranding<K extends keyof ReportTemplateConfig["branding"]>(
    key: K,
    value: ReportTemplateConfig["branding"][K],
  ) {
    setConfig((c) => ({
      ...c,
      branding: { ...c.branding, [key]: value },
    }));
  }

  function resetToDefault() {
    setConfig(DEFAULT_TEMPLATE_CONFIG);
    toast.success("Reset to default template");
  }

  function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        config: JSON.stringify(config),
        isDefault,
      };
      const url =
        mode === "create"
          ? "/api/workspace/templates"
          : `/api/workspace/templates/${templateId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not save template");
        return;
      }
      toast.success(mode === "create" ? "Template created" : "Saved");
      if (mode === "create") {
        const { template } = (await res.json()) as {
          template: { id: string };
        };
        router.push(`/settings/templates/${template.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Template details
        </h2>
        <div className="space-y-2">
          <Label htmlFor="t-name">Name</Label>
          <Input
            id="t-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Standard report"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-desc">Description</Label>
          <Textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this template for? (optional)"
            rows={2}
          />
        </div>
        <label className="flex items-center justify-between rounded-md border bg-card/40 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Use as workspace default</p>
            <p className="text-xs text-muted-foreground">
              New projects use this template, plus any project with no template
              picked.
            </p>
          </div>
          <Switch checked={isDefault} onCheckedChange={setIsDefault} />
        </label>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Sections
          </h2>
          <button
            type="button"
            onClick={resetToDefault}
            className="text-xs text-primary hover:underline"
          >
            Reset to default
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Toggle whole sections on or off. Off sections won&apos;t render on
          the project page or appear in the PDF export.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-md border bg-card/40 px-3 py-2"
            >
              <span className="text-sm">{SECTION_LABELS[key]}</span>
              <Switch
                checked={config.sections[key]}
                onCheckedChange={(v) => setSection(key, v)}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Layout
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>KPI columns</Label>
            <Select
              value={String(config.layout.kpiColumns)}
              onValueChange={(v) =>
                setLayout("kpiColumns", Number(v) as KpiColumns)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 columns</SelectItem>
                <SelectItem value="4">4 columns</SelectItem>
                <SelectItem value="5">5 columns</SelectItem>
                <SelectItem value="6">6 columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Density</Label>
            <Select
              value={config.layout.density}
              onValueChange={(v) => setLayout("density", v as Density)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rows per table</Label>
            <Select
              value={String(config.layout.tableLimit)}
              onValueChange={(v) =>
                setLayout("tableLimit", Number(v) as TableLimit)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="25">Top 25</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
                <SelectItem value="100">Top 100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          PDF branding
        </h2>
        <div className="space-y-2">
          <Label htmlFor="t-header">Header subtitle</Label>
          <Input
            id="t-header"
            value={config.branding.headerText ?? ""}
            onChange={(e) =>
              setBranding(
                "headerText",
                e.target.value.trim() ? e.target.value : null,
              )
            }
            placeholder="Prepared by DigitalLeap Marketing"
          />
          <p className="text-xs text-muted-foreground">
            Shows under the project name in the PDF header.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-footer">Footer text</Label>
          <Input
            id="t-footer"
            value={config.branding.footerText ?? ""}
            onChange={(e) =>
              setBranding(
                "footerText",
                e.target.value.trim() ? e.target.value : null,
              )
            }
            placeholder="info@digitalleap.com · digitalleap.com"
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {mode === "create" ? "Create template" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
