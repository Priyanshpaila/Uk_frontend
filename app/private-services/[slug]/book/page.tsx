'use client';

import * as React from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Local fallback type for our flow steps
export type StepKey = 'treatments' | 'login' | 'raf' | 'calendar' | 'payment' | 'success';

const TreatmentsStep = dynamic(() => import('./steps/TreatmentsStep'), { ssr: false });
const LoginStep      = dynamic(() => import('./steps/LoginStep'),      { ssr: false });
const RafStep        = dynamic(() => import('./steps/RafStep'),    { ssr: false });
const CalendarStep   = dynamic(() => import('./steps/CalendarStep'),   { ssr: false });
const PaymentStep    = dynamic(() => import('./steps/PaymentStep'),    { ssr: false });
const SuccessStep    = dynamic(() => import('./steps/SuccessStep'), { ssr: false });

const DEFAULT_FLOW: StepKey[] = ['treatments','login','raf','calendar','payment','success'];

// --- Auth helpers: detect logged-in state on the client ---
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const pairs = document.cookie.split('; ');
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = decodeURIComponent(pair.slice(0, eq));
    if (key === name) {
      return decodeURIComponent(pair.slice(eq + 1));
    }
  }
  return null;
}

function hasTokenLocally(): string | null {
  try {
    const t = localStorage.getItem('token');
    if (t) return t;
  } catch {}
  const c = readCookie('auth_token') || readCookie('token');
  return c || null;
}

const useAuthStatus = () => {
  const [loggedIn, setLoggedIn] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function check() {
      const tok = hasTokenLocally();
      if (!tok) {
        if (!cancelled) setLoggedIn(false);
        return;
      }

      // Try to verify with the backend; fall back to optimistic if it fails
      try {
        const res = await fetch('/api/users/me', {
          headers: { Accept: 'application/json', Authorization: `Bearer ${tok}` },
          cache: 'no-store',
        });
        if (!cancelled) setLoggedIn(res.ok);
        if (!res.ok) {
          // clear obviously bad token so user can log in cleanly next time
          try { localStorage.removeItem('token'); } catch {}
        }
      } catch {
        // Network issue: assume logged in if we at least have a token/cookie
        if (!cancelled) setLoggedIn(true);
      }
    }

    check();

    // React to auth changes fired elsewhere (login/register/logout)
    const onEvt = () => check();
    window.addEventListener('pe-auth-changed', onEvt);
    return () => {
      cancelled = true;
      window.removeEventListener('pe-auth-changed', onEvt);
    };
  }, []);

  return loggedIn;
};

export default function BookServicePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const slug = params?.slug ?? '';

  const isLoggedIn = useAuthStatus();
  const flow = React.useMemo<StepKey[]>(
    () => (isLoggedIn ? DEFAULT_FLOW.filter(s => s !== 'login') : DEFAULT_FLOW),
    [isLoggedIn]
  );

  const stepParam: StepKey = React.useMemo(() => {
    const raw = (search?.get('step') || '').toString().toLowerCase().trim();
    const synonyms: Record<string, StepKey> = {
      thankyou: 'success',
      thanks: 'success',
      done: 'success',
      paid: 'success',
    };
    const s = (synonyms[raw] || raw) as StepKey;
    const allowed: StepKey[] = ['treatments', 'login', 'raf', 'calendar', 'payment', 'success'];
    return allowed.includes(s) ? s : flow[0];
  }, [search, flow]);

  const currentIndex = React.useMemo(() => {
    const idx = flow.indexOf(stepParam);
    return idx >= 0 ? idx : 0;
  }, [flow, stepParam]);

  const currentStep = flow[currentIndex] ?? flow[0];

  // API base for bookings
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';
  const bookingBusyRef = React.useRef(false);

  function readSelectedIso(): string | null {
    try {
      const keys = ['appointment_at', 'selected_appointment_at', 'booking_at', 'calendar_selected_at'];
      for (const k of keys) {
        const v = sessionStorage.getItem(k) || localStorage.getItem(k);
        if (v) return v;
      }
    } catch {}
    const fromQuery = search?.get('at');
    return fromQuery ? String(fromQuery) : null;
  }

  async function bookSelectedIfNeeded(): Promise<{ ok: boolean; message?: string }> {
    if (bookingBusyRef.current) return { ok: true };
    const iso = readSelectedIso();
    if (!iso) return { ok: false, message: 'Pick a time first' };

    bookingBusyRef.current = true;
    try {
      const res = await fetch(`${apiBase}/api/appointments`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_at: iso, service_slug: slug, status: 'booked' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        return { ok: false, message: j?.message || `Failed to book time. HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Network error' };
    } finally {
      bookingBusyRef.current = false;
    }
  }

  // If the URL points at "login" but the user is authenticated, jump to the next logical step.
  React.useEffect(() => {
    if (!isLoggedIn) return;
    if (stepParam === 'login') {
      const idx = DEFAULT_FLOW.indexOf('login');
      const afterLogin = DEFAULT_FLOW[idx + 1] as StepKey | undefined;
      const target = afterLogin ?? flow[0];
      const q = new URLSearchParams(search?.toString() ?? '');
      q.set('step', target);
      router.replace(`/private-services/${slug}/book?${q.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, stepParam, slug]);

  // If we arrive with an order/ref but no valid step, force success step
  React.useEffect(() => {
    const hasOrder = !!(search?.get('order') || search?.get('ref') || search?.get('reference'));
    const rawStep = (search?.get('step') || '').toString().trim();
    if (hasOrder && !rawStep) {
      const q = new URLSearchParams(search?.toString() ?? '');
      q.set('step', 'success');
      router.replace(`/private-services/${slug}/book?${q.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, slug]);

  const goTo = (next: StepKey) => {
    const q = new URLSearchParams(search?.toString() ?? '');
    q.set('step', next);
    router.replace(`/private-services/${slug}/book?${q.toString()}`);
  };
  const goNext = async () => {
    // When leaving the calendar step, create the appointment server-side first
    if (currentStep === 'calendar') {
      const { ok, message } = await bookSelectedIfNeeded();
      if (!ok) {
        alert(message || 'Could not book that time. Please choose another.');
        return;
      }
    }
    const n = flow[currentIndex + 1];
    if (n) goTo(n);
  };
  const goPrev = () => { const p = flow[currentIndex - 1]; if (p) goTo(p); };

  const StepMap: Record<Exclude<StepKey,'treatments'>, React.ComponentType<any>> = {
    login: LoginStep,
    raf: RafStep,
    calendar: CalendarStep,
    payment: PaymentStep,
    success: SuccessStep,
  };
  const Current = currentStep === 'treatments' ? null : StepMap[currentStep as Exclude<StepKey,'treatments'>];

  return (
    <div style={{ padding: '24px 16px 64px' }}>
      {/* Header pills */}
      <div style={{ maxWidth: 980, margin: '0 auto 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <a href={`/private-services/${slug}`} style={{ opacity: 0.8 }}>← Back</a>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {flow.map((s, i) => (
            <div key={s} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', opacity: i === currentIndex ? 1 : 0.55 }}>
              {`${i + 1}. ${
                s === 'treatments'
                  ? 'Treatments'
                  : s === 'login'
                  ? 'Login'
                  : s.charAt(0).toUpperCase() + s.slice(1)
              }`}
            </div>
          ))}
        </div>
      </div>

      {/* Current step */}
      {currentStep === 'treatments'
        ? <TreatmentsStep serviceSlug={slug} onContinue={goNext} />
        : (Current ? <Current /> : null)
      }

      {/* Footer controls */}
      {currentStep !== 'success' && (
        <div style={{ maxWidth: 980, margin: '24px auto 0', display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            style={{
              backgroundColor: '#e5e7eb',
              color: '#111827',
              border: 'none',
              borderRadius: 9999,
              padding: '8px 20px',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            ← Previous
          </button>
          <button
            onClick={goNext}
            disabled={currentIndex >= flow.length - 1}
            style={{
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              padding: '8px 20px',
              cursor: currentIndex >= flow.length - 1 ? 'not-allowed' : 'pointer',
              opacity: currentIndex >= flow.length - 1 ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}