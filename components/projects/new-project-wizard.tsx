"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Step = 1 | 2 | 3 | 4;

const COUNTRIES: { code: string; label: string }[] = [
  { code: "usa", label: "United States" },
  { code: "gbr", label: "United Kingdom" },
  { code: "can", label: "Canada" },
  { code: "aus", label: "Australia" },
  { code: "ind", label: "India" },
  { code: "deu", label: "Germany" },
  { code: "fra", label: "France" },
  { code: "esp", label: "Spain" },
  { code: "ita", label: "Italy" },
  { code: "nld", label: "Netherlands" },
];

export function NewProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const [keywords, setKeywords] = useState("");
  const [country, setCountry] = useState("usa");
  const [device, setDevice] = useState<"all" | "desktop" | "mobile" | "tablet">(
    "all",
  );
  const [tag, setTag] = useState("");

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Logo must be under 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function validateStep1(): boolean {
    if (!name.trim()) {
      toast.error("Enter a project name");
      return false;
    }
    if (!domain.trim()) {
      toast.error("Enter a domain");
      return false;
    }
    return true;
  }

  function finalSave() {
    startTransition(async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain, logoUrl: logoDataUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not create project");
        return;
      }
      const { project } = (await res.json()) as {
        project: { id: string; name: string };
      };

      const queries = keywords
        .split(/\r?\n/)
        .map((q) => q.trim())
        .filter(Boolean);
      if (queries.length > 0) {
        const kwRes = await fetch(`/api/projects/${project.id}/keywords`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queries,
            country,
            device,
            tag: tag.trim() || null,
          }),
        });
        if (!kwRes.ok) {
          toast.warning(
            "Project created, but some keywords could not be added.",
          );
        }
      }

      toast.success(`Created ${project.name}`);
      router.push(`/projects/${project.id}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <StepIndicator current={step} />
      <div className="mt-8 space-y-6">
        {step === 1 && (
          <Step1
            name={name}
            domain={domain}
            logoDataUrl={logoDataUrl}
            onName={setName}
            onDomain={setDomain}
            onLogoChange={handleLogoChange}
            onLogoClear={() => setLogoDataUrl(null)}
          />
        )}
        {step === 2 && <Step2Locked />}
        {step === 3 && <Step3Locked />}
        {step === 4 && (
          <Step4
            keywords={keywords}
            country={country}
            device={device}
            tag={tag}
            onKeywords={setKeywords}
            onCountry={setCountry}
            onDevice={(d) => setDevice(d)}
            onTag={setTag}
          />
        )}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
          disabled={step === 1 || isPending}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < 4 ? (
          <Button
            type="button"
            onClick={() => {
              if (step === 1 && !validateStep1()) return;
              setStep((s) => Math.min(4, (s + 1) as Step) as Step);
            }}
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={finalSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create project
          </Button>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { num: 1, label: "Project" },
    { num: 2, label: "Connect Google" },
    { num: 3, label: "Pick data sources" },
    { num: 4, label: "Keywords" },
  ];
  return (
    <ol className="flex items-center justify-between gap-2">
      {steps.map((s, i) => (
        <li key={s.num} className="flex flex-1 items-center gap-2">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              s.num === current
                ? "bg-primary text-primary-foreground"
                : s.num < current
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {s.num}
          </div>
          <span
            className={`hidden text-sm sm:inline ${
              s.num === current ? "font-medium" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 ? (
            <div className="ml-2 hidden h-px flex-1 bg-border sm:block" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Step1({
  name,
  domain,
  logoDataUrl,
  onName,
  onDomain,
  onLogoChange,
  onLogoClear,
}: {
  name: string;
  domain: string;
  logoDataUrl: string | null;
  onName: (v: string) => void;
  onDomain: (v: string) => void;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoClear: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Tell us about the project</h2>
        <p className="text-sm text-muted-foreground">
          You can edit any of this later from project settings.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Acme Corp"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="domain">Primary domain</Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => onDomain(e.target.value)}
          placeholder="example.com"
        />
        <p className="text-xs text-muted-foreground">
          Without https:// — just the bare domain.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo">Logo (optional)</Label>
        <div className="flex items-center gap-3">
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoDataUrl}
              alt=""
              className="h-12 w-12 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              No logo
            </div>
          )}
          <Input
            id="logo"
            type="file"
            accept="image/*"
            onChange={onLogoChange}
          />
          {logoDataUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLogoClear}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Step2Locked() {
  return (
    <div className="space-y-4 rounded-lg border border-dashed bg-card/40 p-6 text-center">
      <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
      <div>
        <h3 className="font-semibold">Connect Google</h3>
        <p className="text-sm text-muted-foreground">
          Wired up in Phase 4. You&apos;ll be able to skip this and connect
          later from project settings.
        </p>
      </div>
    </div>
  );
}

function Step3Locked() {
  return (
    <div className="space-y-4 rounded-lg border border-dashed bg-card/40 p-6 text-center">
      <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
      <div>
        <h3 className="font-semibold">Pick GSC site &amp; GA4 property</h3>
        <p className="text-sm text-muted-foreground">
          Wired up in Phase 4. Both will be optional — you can add or change
          them anytime.
        </p>
      </div>
    </div>
  );
}

function Step4({
  keywords,
  country,
  device,
  tag,
  onKeywords,
  onCountry,
  onDevice,
  onTag,
}: {
  keywords: string;
  country: string;
  device: "all" | "desktop" | "mobile" | "tablet";
  tag: string;
  onKeywords: (v: string) => void;
  onCountry: (v: string) => void;
  onDevice: (v: "all" | "desktop" | "mobile" | "tablet") => void;
  onTag: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Initial keywords</h2>
        <p className="text-sm text-muted-foreground">
          Paste keywords, one per line. You can add more later.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="keywords">Keywords</Label>
        <Textarea
          id="keywords"
          rows={8}
          value={keywords}
          onChange={(e) => onKeywords(e.target.value)}
          placeholder={"buy widgets\nbest widget brand\nwidget repair near me"}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={country} onValueChange={onCountry}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Device</Label>
          <Select
            value={device}
            onValueChange={(v) =>
              onDevice(v as "all" | "desktop" | "mobile" | "tablet")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tag">Tag (optional)</Label>
          <Input
            id="tag"
            value={tag}
            onChange={(e) => onTag(e.target.value)}
            placeholder="brand, money, etc."
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: you can skip this and add keywords later from the project page.
      </p>
    </div>
  );
}
