// components/ImportFormButton.tsx
"use client";

import { useRef } from "react";
import { z } from "zod";

const rafOption = z.union([z.literal("Yes"), z.literal("No"), z.literal("Unsure")]);

const Field = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("multiselect"),
    label: z.string(),
    required: z.boolean().optional(),
    options: z.array(z.string()),
    help: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("date"),
    label: z.string(),
    required: z.boolean().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("textarea"),
    label: z.string(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    help: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("radio"),
    label: z.string(),
    required: z.boolean().optional(),
    options: z.array(rafOption),
    defaultValue: rafOption.optional(),
    details: z
      .object({
        id: z.string(),
        label: z.string(),
        placeholder: z.string().optional(),
        showIfIn: z.array(rafOption),
      })
      .optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("file"),
    label: z.string(),
    required: z.boolean().optional(),
    accept: z.string().optional(),
    help: z.string().optional(),
  }),
]);

const Section = z.object({
  id: z.string(),
  title: z.string(),
  fields: z.array(Field),
});

const ImportSchema = z.array(Section);

export type RAFField = z.infer<typeof Field>;
export type RAFSection = z.infer<typeof Section>;

export default function ImportFormButton({
  onImport,
  className = "",
  label = "Import JSON",
}: {
  onImport: (sections: RAFSection[]) => void;
  className?: string;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pick = () => fileRef.current?.click();

  // Accepts either pure JSON or a TS export like: `export const travelClinicRafForm = [ ... ];`
  function tsLikeArrayToJson(src: string): string {
    const s = src.trim();
    if (s.startsWith("[") || s.startsWith("{")) return s;

    let out = s
      .replace(/^export\s+default\s+/m, "")
      .replace(/^export\s+const\s+\w+\s*=\s*/m, "")
      .replace(/^const\s+\w+\s*=\s*/m, "");

    out = out.replace(/;\s*$/, "");
    return out.trim();
  }

  const handleFiles = async (f?: File | null): Promise<void> => {
    if (!f) return;
    try {
      const text = await f.text();
      const cleaned = tsLikeArrayToJson(text);
      const json = JSON.parse(cleaned);
      const parsed = ImportSchema.parse(json);
      onImport(parsed);
      alert(`Imported ${parsed.length} section(s) successfully.`);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Import failed: ${msg}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={pick}
        className={`inline-flex items-center rounded-md px-3 py-2 border border-gray-300 hover:bg-gray-50 ${className}`}
      >
        {label}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json,.txt,.ts,.tsx"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files?.[0] ?? null)}
      />
    </>
  );
}