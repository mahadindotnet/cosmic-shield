"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type EntryValues = Record<string, FormDataEntryValue>;

export interface EntryFormProps {
  title: string;
  description?: string;
  submitLabel?: string;
  /** Called with the form's values. Without it, the entry is validated but not stored. */
  onSubmit?: (values: EntryValues) => void | Promise<void>;
  /** Small print under the submit button. */
  footnote?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Card-framed <form> used by every module to log a reading. Field layout is
 * up to the caller (use EntryField / EntryFieldGrid). Native constraint
 * validation (required, min, max) runs before onSubmit.
 */
export function EntryForm({
  title,
  description,
  submitLabel = "Log entry",
  onSubmit,
  footnote,
  className,
  children,
}: EntryFormProps) {
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    if (!onSubmit) {
      toast.message(`${title}: entry checked`, {
        description: "Storage isn't connected yet, so nothing was saved.",
      });
      return;
    }
    setPending(true);
    try {
      await onSubmit(values);
      form.reset();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Plus className="size-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3">
        <CardContent className="flex flex-col gap-3">{children}</CardContent>
        <CardFooter className="mt-auto flex-col items-stretch gap-2 bg-transparent">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : submitLabel}
          </Button>
          {footnote && <p className="text-center text-[11px] text-muted-foreground">{footnote}</p>}
        </CardFooter>
      </form>
    </Card>
  );
}

/** Labelled field with optional unit suffix and hint. */
export function EntryField({
  label,
  name,
  unit,
  hint,
  className,
  ...inputProps
}: {
  label: string;
  name: string;
  unit?: string;
  hint?: string;
  className?: string;
} & Omit<React.ComponentProps<"input">, "name" | "className">) {
  const id = `entry-${name}`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          className={cn(inputProps.type === "number" && "font-mono tabular-nums", unit && "pr-14")}
          {...inputProps}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center font-mono text-[11px] text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EntryFieldGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>{children}</div>;
}

/** Single-choice row of buttons backed by native radios (works with FormData). */
export function SegmentedField({
  label,
  name,
  options,
  required,
  hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string; title?: string }[];
  required?: boolean;
  hint?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o.value} title={o.title} className="cursor-pointer">
            <input type="radio" name={name} value={o.value} required={required} className="peer sr-only" />
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-input bg-input/30 px-2.5 font-mono text-xs text-muted-foreground transition-colors peer-checked:border-primary/60 peer-checked:bg-primary/15 peer-checked:text-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:text-foreground">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}
