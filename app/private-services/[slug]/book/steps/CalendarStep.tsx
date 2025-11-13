"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Slot = {
  time: string;
  start_at: string; // ISO
  available: boolean;
  remaining: number;
};

type ApiResp = {
  date: string;
  timezone?: string;
  open: boolean;
  slot_minutes: number;
  capacity: number;
  slots: Slot[];
};

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function prettyDate(yyyyMmDd: string) {
  const d = new Date(yyyyMmDd + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function splitIsoToParts(iso: string): { date: string; time: string } {
  // Try fast regex yyyy-mm-dd and hh:mm
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (m) return { date: m[1], time: m[2] };
  // Fallback via Date parsing
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

function persistAppointment(iso: string, opts?: { label?: string; serviceSlug?: string }) {
  const { date, time } = splitIsoToParts(iso);
  const pretty = new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  try {
    if (typeof window !== 'undefined') {
      // canonical keys used by PaymentStep and SuccessStep
      localStorage.setItem('appointment_at', iso);
      sessionStorage.setItem('appointment_at', iso);

      if (date) {
        localStorage.setItem('appointment_date', date);
        sessionStorage.setItem('appointment_date', date);
      }
      if (time) {
        localStorage.setItem('appointment_time', time);
        sessionStorage.setItem('appointment_time', time);
      }
      if (opts?.label) {
        localStorage.setItem('appointment_time_label', opts.label);
      }
      localStorage.setItem('appointment_pretty', pretty);

      if (opts?.serviceSlug) {
        localStorage.setItem('service_slug', opts.serviceSlug);
        sessionStorage.setItem('service_slug', opts.serviceSlug);
      }
    }
  } catch {
    // ignore storage errors
  }
}

export default function CalendarStep({ serviceSlug }: { serviceSlug?: string }) {
  const [date, setDate] = useState<string>(() => ymd(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (serviceSlug) {
        localStorage.setItem('service_slug', serviceSlug);
        sessionStorage.setItem('service_slug', serviceSlug);
      }
    } catch {}
  }, [serviceSlug]);

  // Configure your API base in .env as NEXT_PUBLIC_API_BASE=http://localhost:8000
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
  const minDate = useMemo(() => ymd(new Date()), []);
  const maxDate = useMemo(() => ymd(addDays(new Date(), 180)), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedIso(null);

    const url = new URL("/api/availability/day", apiBase);
    url.searchParams.set("date", date);
    if (serviceSlug) url.searchParams.set("service", serviceSlug);

    fetch(url.toString(), { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ApiResp;
      })
      .then((json) => {
        if (!cancelled) setSlots(json.slots ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, serviceSlug, apiBase]);

  function shiftDay(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const next = ymd(d);
    if (next < minDate) return; // prevent going before today
    setDate(next);
  }
  const atStart = date <= minDate; // cannot go back before today

  function handleSelect(iso: string, label?: string) {
    setSelectedIso(iso);
    persistAppointment(iso, { label, serviceSlug });
  }

  const paymentHref = useMemo(() => {
    const base = `/private-services/${serviceSlug ?? ""}/book?step=payment`;
    if (!selectedIso) return base;
    // Build a relative URL with extra query: appointment_at
    const u = new URL(base, "http://dummy");
    u.searchParams.set("appointment_at", selectedIso);
    return u.pathname + u.search + u.hash;
  }, [selectedIso, serviceSlug]);

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Choose an appointment</h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => !atStart && shiftDay(-1)}
              disabled={atStart}
              aria-disabled={atStart}
              className={`rounded-full border px-3 py-1 ${atStart ? 'invisible cursor-not-allowed' : 'hover:bg-gray-50'}`}
              aria-label="Previous day"
              title={atStart ? undefined : "Previous day"}
            >
              ‹
            </button>
            <div className="min-w-[8rem] text-sm font-medium text-gray-700 text-center">
              {prettyDate(date)}
            </div>
            <button
              type="button"
              onClick={() => shiftDay(1)}
              className="rounded-full border px-3 py-1 hover:bg-gray-50"
              aria-label="Next day"
              title="Next day"
            >
              ›
            </button>
          </div>

          <div className="hidden sm:block h-5 w-px bg-gray-200" />

          <input
            id="date-picker"
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border px-3 py-1 text-sm"
          />
        </div>
      </div>

      <p className="mt-2 text-gray-600">Select a time below.</p>

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-gray-500">Loading slots…</div>
        ) : error ? (
          <div className="text-sm text-rose-600">Failed to load slots: {error}</div>
        ) : slots.length === 0 ? (
          <div className="text-sm text-gray-500">No slots available for this date.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {slots.map((s) => {
              const isSelected = selectedIso === s.start_at;
              const isDisabled = !s.available;
              return (
                <button
                  key={s.start_at}
                  type="button"
                  onClick={() => !isDisabled && handleSelect(s.start_at, s.time)}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isSelected ? "ring-2 ring-emerald-500 border-emerald-500" : "hover:bg-gray-50"
                  } ${isDisabled ? "opacity-60 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200" : ""}`}
                  title={isDisabled ? "This time is not available" : undefined}
                >
                  <div className="font-medium">{s.time}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      
    </div>
  );
}