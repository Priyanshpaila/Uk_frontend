'use client';

import * as React from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useCart } from '@/components/cart-context';

// Local fallback type for our flow steps
export type StepKey =
  | 'treatments'
  | 'login'
  | 'raf'
  | 'calendar'
  | 'payment'
  | 'success';

const TreatmentsStep = dynamic(() => import('./steps/TreatmentsStep'), {
  ssr: false,
});
const LoginStep = dynamic(() => import('./steps/LoginStep'), { ssr: false });
const RafStep = dynamic(() => import('./steps/RafStep'), { ssr: false });
const CalendarStep = dynamic(() => import('./steps/CalendarStep'), {
  ssr: false,
});
const PaymentStep = dynamic(() => import('./steps/PaymentStep'), {
  ssr: false,
});
const SuccessStep = dynamic(() => import('./steps/SuccessStep'), {
  ssr: false,
});

const DEFAULT_FLOW: StepKey[] = [
  'treatments',
  'login',
  'raf',
  'calendar',
  'payment',
  'success',
];

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
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${tok}`,
          },
          cache: 'no-store',
        });
        if (!cancelled) setLoggedIn(res.ok);
        if (!res.ok) {
          // clear obviously bad token so user can log in cleanly next time
          try {
            localStorage.removeItem('token');
          } catch {}
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

// ---------- Small helpers for order creation ----------

function safeJsonParse<T = any>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readSelectedIsoFromStorage(): string | null {
  try {
    const keys = [
      'appointment_at',
      'selected_appointment_at',
      'booking_at',
      'calendar_selected_at',
    ];
    for (const k of keys) {
      const v = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (v) return v;
    }
  } catch {}
  return null;
}

function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem('user') ||
      localStorage.getItem('user_data') ||
      localStorage.getItem('pe_user') ||
      localStorage.getItem('pe.user');
    const parsed = safeJsonParse<any>(raw);
    if (!parsed) return null;
    return parsed.userId || parsed.id || parsed._id || null;
  } catch {
    return null;
  }
}

function getConsultationSessionId(): number | null {
  if (typeof window === 'undefined') return null;
  const keys = [
    'consultation_session_id',
    'pe_consultation_session_id',
    'consultationSessionId',
  ];
  for (const k of keys) {
    try {
      const raw =
        localStorage.getItem(k) ||
        sessionStorage.getItem(k) ||
        readCookie(k) ||
        null;
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0) return n;
    } catch {}
  }
  return null;
}

function readRafAnswers(slug: string): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  try {
    const keys = [
      `raf_answers.${slug}`,
      `raf.answers.${slug}`,
      `assessment.answers.${slug}`,
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}
  return null;
}

function formatAnswer(v: any): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(formatAnswer).join(', ');
  if (typeof v === 'object') {
    if ('label' in v) return String((v as any).label);
    if ('value' in v) return String((v as any).value);
    return JSON.stringify(v);
  }
  return String(v);
}

function buildRafQA(slug: string): any[] {
  const answers = readRafAnswers(slug);
  if (!answers) return [];
  return Object.entries(answers).map(([key, raw], index) => ({
    key,
    question: `Question ${index + 1}`,
    answer: formatAnswer(raw),
    raw,
  }));
}

type SimpleSchedule = {
  _id: string;
  name: string;
  service_id: string;
  service_slug: string;
  slot_minutes?: number;
};

// Try to load schedule for this service (by stored id or by slug)
async function loadScheduleForOrder(
  apiBase: string,
  serviceSlug: string
): Promise<SimpleSchedule | null> {
  // 1) If we have schedule_id stored from CalendarStep, try that first.
  let storedId: string | null = null;
  try {
    storedId =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('schedule_id') ||
          sessionStorage.getItem('schedule_id'))) ||
      null;
  } catch {
    storedId = null;
  }

  if (storedId) {
    try {
      const res = await fetch(`${apiBase}/api/schedules/${storedId}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const sch = (await res.json()) as SimpleSchedule;
        if (sch && sch._id) return sch;
      }
    } catch {
      // ignore and fall back to list
    }
  }

  // 2) Fallback: list all schedules and find by service_slug
  try {
    const res = await fetch(`${apiBase}/api/schedules`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    let list: SimpleSchedule[] = [];
    if (Array.isArray((json as any)?.data)) {
      list = (json as any).data;
    } else if (Array.isArray(json)) {
      list = json;
    }
    const match =
      list.find((s) => s.service_slug === serviceSlug) || list[0] || null;
    return match || null;
  } catch {
    return null;
  }
}

function buildOrderMeta(opts: {
  cartItems: any[];
  serviceSlug: string;
  serviceName?: string;
  appointmentIso: string;
}) {
  const items = (opts.cartItems || []).map((ci: any) => {
    const unitMinor =
      typeof ci.unitMinor === 'number'
        ? ci.unitMinor
        : ci.price
        ? Math.round(Number(ci.price) * 100)
        : 0;
    const qty = Number(ci.qty || 1);
    const totalMinor =
      typeof ci.totalMinor === 'number'
        ? ci.totalMinor
        : unitMinor * qty;

    const variation =
      ci.variation ||
      ci.variations ||
      ci.optionLabel ||
      ci.selectedLabel ||
      ci.label ||
      '';

    return {
      sku: ci.sku,
      name: ci.name,
      variations: variation || null,
      strength: ci.strength ?? null,
      qty,
      unitMinor,
      totalMinor,
      variation: variation || null,
    };
  });

  const lines = items.map((it: any, index: number) => ({
    index,
    name: it.name,
    qty: it.qty,
    variation: it.variation || it.variations || '',
  }));

  const totalMinor = items.reduce(
    (sum: number, it: any) => sum + (it.totalMinor || 0),
    0
  );

  const sessionId = getConsultationSessionId();
  const rafQA = buildRafQA(opts.serviceSlug);

  const meta: any = {
    type: 'new',
    lines,
    items,
    totalMinor,
    service_slug: opts.serviceSlug,
    service: opts.serviceName || opts.serviceSlug,
    appointment_start_at: opts.appointmentIso,
    consultation_session_id: sessionId ?? undefined,
    payment_status: 'pending',
    formsQA: {
      risk_assessment: {
        form_id: null,
        schema_version: null,
        qa: [],
      },
      assessment: {
        form_id: null,
        schema_version: null,
        qa: [],
      },
      raf: {
        form_id: null,
        schema_version: null,
        qa: rafQA,
      },
    },
  };

  if (items[0]) {
    const first = items[0];
    meta.selectedProduct = {
      name: first.name,
      variation: first.variation || first.variations || null,
      strength: first.strength || first.variation || null,
      qty: first.qty,
      unitMinor: first.unitMinor,
      totalMinor: first.totalMinor,
    };
  }

  return meta;
}

// Create ISO end_at by adding slotMinutes to start_at
function computeEndIso(startIso: string, slotMinutes?: number): string {
  const d = new Date(startIso);
  if (Number.isNaN(d.getTime())) return startIso;
  const mins = Number.isFinite(slotMinutes || 0) && slotMinutes! > 0
    ? slotMinutes!
    : 15;
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

export default function BookServicePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const slug = params?.slug ?? '';

  const isLoggedIn = useAuthStatus();

  // 🛒 Read cart state (for gating treatments step & order meta)
  const cart = useCart() as any;
  const cartItems: any[] = Array.isArray(cart?.items)
    ? cart.items
    : Array.isArray(cart?.state?.items)
    ? cart.state.items
    : [];
  const hasCartItems = cartItems.length > 0;

  const flow = React.useMemo<StepKey[]>(
    () => (isLoggedIn ? DEFAULT_FLOW.filter((s) => s !== 'login') : DEFAULT_FLOW),
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
    const allowed: StepKey[] = [
      'treatments',
      'login',
      'raf',
      'calendar',
      'payment',
      'success',
    ];
    return allowed.includes(s) ? s : flow[0];
  }, [search, flow]);

  const currentIndex = React.useMemo(() => {
    const idx = flow.indexOf(stepParam);
    return idx >= 0 ? idx : 0;
  }, [flow, stepParam]);

  const currentStep = flow[currentIndex] ?? flow[0];

  // API base for bookings / orders
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000').replace(
    /\/+$/,
    ''
  );
  const bookingBusyRef = React.useRef(false);

  // 🔒 Step guard: decide if user can move forward from the current step
  const canProceedFrom = React.useCallback(
    (step: StepKey): { ok: boolean; message?: string } => {
      // 1) Treatments: must have at least one item in cart
      if (step === 'treatments' && !hasCartItems) {
        return {
          ok: false,
          message:
            'Please add at least one treatment/medicine to your basket before continuing.',
        };
      }

      // 2) Login: must actually be logged in
      if (step === 'login' && !isLoggedIn) {
        return {
          ok: false,
          message: 'Please log in or create an account before continuing.',
        };
      }

      return { ok: true };
    },
    [hasCartItems, isLoggedIn]
  );

  // ⚙️ Create order when leaving the calendar step
  async function createOrderIfNeeded(): Promise<{ ok: boolean; message?: string }> {
    if (bookingBusyRef.current) return { ok: true };

    const startIso = readSelectedIsoFromStorage();
    if (!startIso) {
      return { ok: false, message: 'Pick an appointment time first.' };
    }

    const userId = getCurrentUserId();
    if (!userId) {
      return {
        ok: false,
        message: 'Could not determine your user. Please log in again.',
      };
    }

    if (!hasCartItems) {
      return {
        ok: false,
        message: 'Your basket is empty. Please add at least one item.',
      };
    }

    bookingBusyRef.current = true;
    try {
      // 1) Load schedule (for schedule_id, service_id, slot_minutes, name)
      const schedule = await loadScheduleForOrder(apiBase, slug);
      if (!schedule) {
        return {
          ok: false,
          message: 'No schedule configured for this service.',
        };
      }

      const scheduleId = schedule._id;
      const serviceId = schedule.service_id;
      const slotMinutes = schedule.slot_minutes ?? 15;

      // 2) Build end_at from slot length
      const endIso = computeEndIso(startIso, slotMinutes);

      // 3) Random reference for now
      const now = new Date();
      const ref = `ORD-${now.getFullYear()}-${now
        .getTime()
        .toString(36)
        .toUpperCase()}`;

      // 4) Build meta from cart + forms + appointment
      const meta = buildOrderMeta({
        cartItems,
        serviceSlug: slug,
        serviceName: schedule.name,
        appointmentIso: startIso,
      });

      const body: any = {
        user_id: userId,
        schedule_id: scheduleId,
        service_id: serviceId,
        reference: ref,
        start_at: startIso,
        end_at: endIso,
        meta,
        payment_status: 'pending',
      };

      const res = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const text = await res.text().catch(() => '');
      if (!res.ok) {
        // Try to see if backend sent JSON with message
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg = j?.message || msg;
        } catch {}
        return {
          ok: false,
          message:
            msg ||
            `Failed to create order (HTTP ${res.status}). Check required fields on the backend.`,
        };
      }

      let order: any = null;
      try {
        order = text ? JSON.parse(text) : null;
      } catch {
        order = null;
      }

      // Store order id/reference for later steps
      try {
        if (order?._id) {
          localStorage.setItem('order_id', String(order._id));
          sessionStorage.setItem('order_id', String(order._id));
        }
        if (order?.reference || ref) {
          const finalRef = order?.reference || ref;
          localStorage.setItem('order_reference', String(finalRef));
          sessionStorage.setItem('order_reference', String(finalRef));
        }
      } catch {}

      return { ok: true };
    } catch (e: any) {
      return {
        ok: false,
        message: e?.message || 'Network error while creating order.',
      };
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
    const hasOrder = !!(
      search?.get('order') ||
      search?.get('ref') ||
      search?.get('reference')
    );
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
    // 🔒 First, generic guard per step
    const guard = canProceedFrom(currentStep);
    if (!guard.ok) {
      if (guard.message) alert(guard.message);
      return;
    }

    // When leaving the calendar step, create the ORDER server-side first
    if (currentStep === 'calendar') {
      const { ok, message } = await createOrderIfNeeded();
      if (!ok) {
        alert(message || 'Could not create your order. Please try again.');
        return;
      }
    }

    const n = flow[currentIndex + 1];
    if (n) goTo(n);
  };

  const goPrev = () => {
    const p = flow[currentIndex - 1];
    if (p) goTo(p);
  };

  const StepMap: Record<
    Exclude<StepKey, 'treatments'>,
    React.ComponentType<any>
  > = {
    login: LoginStep,
    raf: RafStep,
    calendar: CalendarStep,
    payment: PaymentStep,
    success: SuccessStep,
  };
  const Current =
    currentStep === 'treatments'
      ? null
      : StepMap[currentStep as keyof typeof StepMap];

  // UI: compute if Next should be disabled (for UX, we still hard-guard in goNext)
  const nextDisabled = React.useMemo(() => {
    if (currentIndex >= flow.length - 1) return true;

    if (currentStep === 'treatments' && !hasCartItems) return true;
    if (currentStep === 'login' && !isLoggedIn) return true;

    // calendar: we allow button, and createOrderIfNeeded will complain if no slot
    return false;
  }, [currentIndex, flow.length, currentStep, hasCartItems, isLoggedIn]);

  return (
    <div style={{ padding: '24px 16px 64px' }}>
      {/* Header pills */}
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto 16px',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <a href={`/private-services/${slug}`} style={{ opacity: 0.8 }}>
          ← Back
        </a>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {flow.map((s, i) => (
            <div
              key={s}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                opacity: i === currentIndex ? 1 : 0.55,
              }}
            >
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
      {currentStep === 'treatments' ? (
        <TreatmentsStep serviceSlug={slug} onContinue={goNext} />
      ) : Current ? (
        <Current serviceSlug={slug} />
      ) : null}

      {/* Footer controls */}
      {currentStep !== 'success' && (
        <div
          style={{
            maxWidth: 980,
            margin: '24px auto 0',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
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
            disabled={nextDisabled}
            style={{
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              padding: '8px 20px',
              cursor: nextDisabled ? 'not-allowed' : 'pointer',
              opacity: nextDisabled ? 0.5 : 1,
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
