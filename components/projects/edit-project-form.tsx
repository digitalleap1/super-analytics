"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().min(1).max(120),
  domain: z.string().min(3).max(255),
});
type Values = z.infer<typeof schema>;

type Props = {
  projectId: string;
  initial: { name: string; domain: string };
};

export function EditProjectForm({ projectId, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  function onSubmit(values: Values) {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not save changes");
        return;
      }
      toast.success("Project updated");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="domain">Domain</Label>
        <Input id="domain" {...register("domain")} />
        {errors.domain && (
          <p className="text-xs text-destructive">{errors.domain.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isPending || !isDirty}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save changes
      </Button>
    </form>
  );
}
