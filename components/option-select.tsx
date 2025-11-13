"use client"

import { useEffect, useRef, useState } from "react"

export type Option = { label: string; price: number }

export default function OptionSelect({
  options,
  value,
  onChange,
  placeholder = "Choose an option",
}: {
  options: Option[]
  value?: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!open) return
      if (
        !popRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [open])

  const selected = options.find(o => o.label === value)

  return (
    <div className="relative pe-dropdown">
        {/* Trigger */}
        <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full rounded-full border border-gray-300 px-4 py-2 text-left
                    flex items-center justify-between transition
                    focus:outline-none focus:ring-2 focus:ring-emerald-500
                    ${open ? "ring-2 ring-emerald-500" : ""}`}
        >
        <span className={selected ? "text-gray-900" : "text-gray-500"}>
            {selected ? selected.label : placeholder}
        </span>
        <svg
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.09l3.71-3.86a.75.75 0 111.08 1.04l-4.24 4.41a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" />
        </svg>
        </button>

        {/* Popover */}
        {open && (
        <div
            ref={popRef}
            role="listbox"
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
        >
            <div className="max-h-80 overflow-auto py-2 pe-scroll">
            {/* Neutral reset option */}
            <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => {
                onChange("");        // clear selection
                setOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none ${
                !value ? "bg-emerald-50" : ""
                }`}
            >
                <span className="text-gray-500">Cancel Option</span>
            </button>

            {/* Real options */}
            {options.map((opt, i) => {
                const active = opt.label === value;
                return (
                <button
                    key={i}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                    onChange(opt.label);
                    setOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-emerald-50 focus:bg-emerald-50
                                focus:outline-none ${active ? "bg-emerald-50" : ""}`}
                >
                    <div className="flex items-start justify-between gap-3">
                    {/* label wraps, no truncation */}
                    <span className="flex-1 whitespace-normal break-words pr-2">
                        {opt.label}
                    </span>
                    {/* right-aligned price, fixed width for tidy column */}
                    <span className="w-24 text-right tabular-nums  shrink-0">
                        £{opt.price.toFixed(2)}
                    </span>
                    </div>
                </button>
                );
            })}
            </div>
        </div>
        )}
    </div>
    );
}
