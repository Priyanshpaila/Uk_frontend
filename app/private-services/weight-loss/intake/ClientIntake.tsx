'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import WeightAssessmentStepper from '@/app/private-services/weight-loss/assessment/WeightAssessmentStepper'
import { WeightAssessment } from '@/forms/weightLossSchema'

declare global {
  interface Window {
    peUploadIntakeImage?: (file: File, kind: 'scale' | 'body') => Promise<{ ok?: boolean; url?: string; path?: string; message?: string } | null>;
  }
}

function readJson<T = any>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function extractTreatmentsFromCart(): string[] {
  try {
    // Try common keys and shapes
    const candidates: any[] = []
    const peCart = readJson<any>('pe_cart_v1') || readJson<any>('pe_cart')
    if (peCart) candidates.push(peCart)
    const cart = readJson<any>('cart')
    if (cart) candidates.push(cart)
    const basket = readJson<any>('basket')
    if (basket) candidates.push(basket)

    const out: string[] = []
    for (const c of candidates) {
      const arr = Array.isArray(c) ? c : (Array.isArray(c?.items) ? c.items : [])
      for (const i of arr) {
        const name = (i?.name || i?.title || '').toString().trim()
        const opt = (i?.optionLabel || i?.opt || i?.strength || i?.dose || '').toString().trim()
        if (name) out.push(opt ? `${name} ${opt}` : name)
      }
    }
    return out
  } catch {
    return []
  }
}

function getCookie(name: string) {
  try {
    const parts = (`; ${document.cookie}`).split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()!.split(';').shift() || null
    return null
  } catch { return null }
}

const LOGIN_GUARD_KEY = 'pe_intake_auth_redirected'
const API_TOKEN = (process.env.NEXT_PUBLIC_API_TOKEN || '').trim()

function getBearerToken(): string {
  try {
    const envTok = (process.env.NEXT_PUBLIC_API_TOKEN || '').trim()
    if (envTok) return envTok
    if (typeof window !== 'undefined') {
      const userTok = localStorage.getItem('token') || ''
      if (userTok) return userTok
    }
  } catch {}
  return ''
}

// Robustly resolve a persisted numeric ID from sessionStorage or localStorage
function getPersistedId(key: string): number {
  try {
    const s = Number(sessionStorage.getItem(key) || '0') || 0;
    if (s > 0) return s;
    const l = Number(localStorage.getItem(key) || '0') || 0;
    return l > 0 ? l : 0;
  } catch {
    return 0;
  }
}

// Stateless XHR helper to bypass any global fetch wrappers that might force cookies
async function postSessionStateless(url: string, payload: any, token: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.withCredentials = false; // CRITICAL: do not send cookies
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = () => {
      const status = xhr.status;
      let body: any = xhr.responseText;
      try { body = body ? JSON.parse(body) : {}; } catch { /* keep raw text */ }
      resolve({ status, body });
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(JSON.stringify(payload));
  });
}

// Upload helper for intake images (scale/body/evidence). Stateless: uses Bearer, no cookies.
async function uploadIntakeImage(apiBase: string, file: File, kind: string = 'intake'): Promise<{ ok: boolean; url?: string; path?: string; message?: string }> {
  try {
    const token = getBearerToken();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);

    const res = await fetch(`${apiBase}/api/uploads/intake-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,           // IMPORTANT: do not set Content-Type; browser will set multipart boundary
      credentials: 'omit' // do not send cookies
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok !== true) {
      return { ok: false, message: (data?.message || `Upload failed (${res.status})`) };
    }
    return { ok: true, url: data.url, path: data.path };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Network error' };
  }
}

type Kind = 'new' | 'transfer'

type Search = Record<string, string | string[] | undefined>

export default function ClientIntake({ initialSearch }: { initialSearch: Search }) {
  const router = useRouter()
  const kindParam =
    Array.isArray(initialSearch.type)
      ? initialSearch.type[0]
      : (initialSearch.type as string | undefined)
  const kind = (kindParam as Kind) || 'new'
  const [sectionLabel, setSectionLabel] = useState<string>('About you')
  const bootedRef = useRef(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [formId, setFormId] = useState<number | null>(null)
  const [sessDiag, setSessDiag] = useState<string>('')
  const apiBase = ((process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000') as string).replace(/\/$/, '')
  const defaultFormId = Number(process.env.NEXT_PUBLIC_WEIGHT_RAF_FORM_ID || process.env.NEXT_PUBLIC_DEFAULT_FORM_ID || 4)
  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    }
    const tok = getBearerToken()
    if (tok) h['Authorization'] = `Bearer ${tok}`
    return h
  }

  // Expose upload helper globally so step components (e.g., AboutYou) can call it without import wiring.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.peUploadIntakeImage = (file: File, kind: 'scale' | 'body') =>
        uploadIntakeImage(apiBase, file, kind);
      return () => { try { delete window.peUploadIntakeImage; } catch {} };
    }
  }, [apiBase]);
  
  // Normalize any incoming treatment(s) and persist for downstream (booking/checkout)
  useEffect(() => {
    try {
      const raw = Array.isArray(initialSearch.treatment)
        ? initialSearch.treatment
        : (initialSearch.treatment ? [initialSearch.treatment as string] : [])

      // also handle a single value like "2.5mg and 5mg Starter Pack" or comma-separated
      const splitTokens = (v: string) => v.split(/\s*(?:,|\band\b)\s*/i).filter(Boolean)

      const fromUrl: string[] = raw.flatMap(v => splitTokens(String(v)))
      const fromCart: string[] = extractTreatmentsFromCart()

      // merge & de‑dupe while preserving order (URL first)
      const seen = new Set<string>()
      const merged: string[] = []
      for (const t of [...fromUrl, ...fromCart]) {
        const k = String(t).trim().toLowerCase()
        if (!k) continue
        if (!seen.has(k)) { seen.add(k); merged.push(String(t).trim()) }
      }

      try { console.debug('[intake] treatments merged', { fromUrl, fromCart, merged }) } catch {}

      if (merged.length) {
        sessionStorage.setItem('pe_selected_treatments', JSON.stringify(merged))
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync URL -> sessionStorage early so refreshes keep IDs even before auth/API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const q = new URLSearchParams(window.location.search);
      const urlSession = Number(q.get('session') || '0') || 0;
      const urlForm    = Number(q.get('form')    || '0') || 0;

      if (urlSession > 0) {
        sessionStorage.setItem('pe_intake_session', String(urlSession));
      }
      if (urlForm > 0) {
        sessionStorage.setItem('pe_intake_form', String(urlForm));
      }
    } catch {
      // ignore
    }
  }, []);
  // Auto-create consultation session if ?session & ?form are missing
  // --- BEGIN: stateless session bootstrap (Bearer only, no cookies) ---

  // lightweight access to current query params
  const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

  // optional loading flag (not currently rendered, but useful if needed)
  const [loading, setLoading] = useState(true)

  // keep ids in storage so refreshes survive
  function persistIds(session: number, form: number) {
    try {
      sessionStorage.setItem('pe_intake_session', String(session));
      sessionStorage.setItem('pe_intake_form', String(form));
      // also persist to localStorage so other pages (checkout/success) can recover on a full reload
      localStorage.setItem('consultation_session_id', String(session));
      localStorage.setItem('consultation_form_id', String(form));
    } catch {}
  }

  // read any saved ids
  function readPersisted() {
    try {
      const s = Number(sessionStorage.getItem('pe_intake_session') || '0') || 0
      const f = Number(sessionStorage.getItem('pe_intake_form') || '0') || 0
      return { s, f }
    } catch { return { s: 0, f: 0 } }
  }

  // Remove any step-local persisted answers (used by previous intake sessions)
  function clearAssessmentStorage() {
    try {
      const KEYS = [
        'pe_weight_aboutyou',
        'pe_weight_conditions',
        'pe_weight_pasthistory',
        'pe_weight_declarations',
        'pe_assessment_done',
      ];
      KEYS.forEach(k => sessionStorage.removeItem(k));
    } catch {}
  }

  useEffect(() => {
    (async () => {
      // 1) must be client
      if (typeof window === 'undefined') return

      // Read previously persisted session id
      const prevSession = Number(sessionStorage.getItem('pe_intake_session') || '0') || 0;

      // 2) must be authenticated (we’re using token auth)
      const token = localStorage.getItem('token')
      if (!token) {
        // bounce to login, back to this page after
        const next = window.location.pathname + window.location.search
        router.replace(`/auth?next=${encodeURIComponent(next)}`)
        return
      }

      // 3) if URL already has ids, adopt them and persist
      const urlSession = Number(sp?.get('session') || '0') || 0
      const urlForm    = Number(sp?.get('form')    || '0') || 0
      if (urlSession > 0 && urlForm > 0) {
        // Clear old answers if switching to a different session
        if (prevSession && prevSession !== urlSession) {
          clearAssessmentStorage();
        }
        setSessionId(urlSession)
        setFormId(urlForm)
        persistIds(urlSession, urlForm)
        setLoading(false)
        return
      }

      // 4) if storage has ids, adopt & patch URL (no reload)
      const { s: savedS, f: savedF } = readPersisted()
      if (savedS > 0 && savedF > 0) {
        const q = new URLSearchParams(window.location.search)
        q.set('session', String(savedS))
        q.set('form', String(savedF))
        router.replace(`${window.location.pathname}?${q.toString()}`)
        setSessionId(savedS)
        setFormId(savedF)
        setLoading(false)
        return
      }

      // 5) create a new session (stateless: Bearer only, NO cookies)
      try {
        const res = await fetch(`${apiBase}/api/consultations/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'omit',
          body: JSON.stringify({
            kind: (sp?.get('type') || 'new').toLowerCase() === 'transfer' ? 'transfer' : 'new',
            // optional: include treatment hint if present in the URL
            treatment: sp?.get('treatment') || undefined,
          }),
        })

        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          console.warn('session create failed', res.status, txt)
          alert(`We could not start your assessment. (${res.status})`)
          setLoading(false)
          return
        }

        const j = await res.json().catch(() => ({}))
        const newId = Number(j?.session_id ?? j?.id ?? 0);
        const newFormId = Number(j?.form_id ?? 0) || defaultFormId;

        if (!newId) {
          alert('We could not start your assessment (no session_id in response).')
          setLoading(false)
          return
        }

        // Clear old answers if switching to a different session
        if (prevSession && prevSession !== newId) {
          clearAssessmentStorage();
        }

        // persist + update URL
        persistIds(newId, newFormId)
        const q = new URLSearchParams(window.location.search)
        q.set('session', String(newId))
        q.set('form', String(newFormId))
        router.replace(`${window.location.pathname}?${q.toString()}`)
        setSessionId(newId)
        setFormId(newFormId)
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- END: stateless session bootstrap ---

  // include email and keep name
  const [assessment, setAssessment] = useState<WeightAssessment>(() => ({
    name: '',               // <<< added so we can prefill Calendly
    ethnicity: [],

    for_self: undefined as any,
    age_18_to_85: undefined as any,
    pregnant_or_breastfeeding_or_planning: undefined as any,

    weight_related_conditions: [],
    smoke: undefined as any,
    drink_alcohol: undefined as any,
    used_weight_loss_before: undefined as any,
    eating_disorder: undefined as any,

    has_conditions_yes: undefined as any,
    has_conditions: [],
    conditions_text: '',
    has_medicines_yes: undefined as any,
    has_medicines: [],
    meds_text: '',
    oral_contraceptives: undefined as any,
    exercise_4_5_per_week: undefined as any,
    daily_calories: undefined as any,

    kidney_or_liver_impairment: undefined as any,
    other_medical_conditions: undefined as any,
    current_or_recent_meds: undefined as any,
    allergies: undefined as any,

    ack_needles_swabs_bin: false,
    ack_first_attempt_delivery: false,
    consent_scr_access: false,

    ack_treatment_rules: undefined as any,
    final_declaration: undefined as any,
  }))

  // Hydrate answers from step-local sessionStorage on first mount so a hard refresh restores progress
  useEffect(() => {
    try {
      const keys = [
        'pe_weight_aboutyou',
        'pe_weight_conditions',
        'pe_weight_pasthistory',
        'pe_weight_declarations',
      ];
      const patch: Record<string, any> = {};
      for (const k of keys) {
        const raw = sessionStorage.getItem(k);
        if (!raw) continue;
        try {
          const obj = JSON.parse(raw);
          if (obj && typeof obj === 'object') Object.assign(patch, obj);
        } catch {}
      }
      if (Object.keys(patch).length > 0) {
        setAssessment((prev: any) => ({ ...(prev || {}), ...patch }));
      }
    } catch {}
  }, []);

  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ index: 0, total: 0 })

  const handleProgress = useCallback((idx: number, total: number) => {
    setProgress({ index: idx, total })
  }, [])

  useEffect(() => {
    try {
      const n = localStorage.getItem('patient_name') || ''
      if (n && !assessment.name) {
        setAssessment(a => ({ ...a, name: n }))
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    try {
      // Prefer a Bearer token for the proxy (falls back to cookie if absent)
      const bearer = (typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '')
        || (process.env.NEXT_PUBLIC_API_TOKEN as string || '')
      setSending(true)
      const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')

      // Resolve IDs from URL, state, or persisted storage (sessionStorage/localStorage)
      const sidResolved =
        Number(sp.get('session') || '0') ||
        (sessionId || 0) ||
        getPersistedId('pe_intake_session') ||
        getPersistedId('consultation_session_id') ||
        0;

      const fidResolved =
        Number(sp.get('form') || '0') ||
        (formId || 0) ||
        getPersistedId('pe_intake_form') ||
        getPersistedId('consultation_form_id') ||
        0;

      // For visibility in browser devtools when submitting
      try { (window as any).__intake_submit_ids = { sidResolved, fidResolved }; } catch {}

      const payload = {
        // Laravel expects "answers"; keep "type" for future use (harmless extra)
        type: kind === 'transfer' ? 'transfer_patient' : 'new_patient',
        answers: assessment,
        session_id: sidResolved || undefined,
        form_id: fidResolved || undefined,
      }
      const res = await fetch('/api/intakes', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('Submit error', res.status, txt)
        throw new Error(`Request failed ${res.status}`)
      }

      // gate and prefill for Calendly
      try {
        sessionStorage.setItem('pe_assessment_done', '1')
        sessionStorage.setItem('pe_name', (assessment?.name || '').trim())
      } catch {}
      try {
        let stored = sessionStorage.getItem('pe_selected_treatments')
        if (!stored) {
          const fromCart = extractTreatmentsFromCart()
          if (fromCart.length) {
            sessionStorage.setItem('pe_selected_treatments', JSON.stringify(fromCart))
            stored = JSON.stringify(fromCart)
          }
        }
        const arr: string[] = stored ? JSON.parse(stored) : []
        const q = new URLSearchParams({ type: kind === 'transfer' ? 'transfer' : 'new' })
        arr.forEach(t => q.append('treatment', t))
        router.push(`/private-services/weight-loss/booking?${q.toString()}`)
      } catch {
        router.push(`/private-services/weight-loss/booking?type=${kind === 'transfer' ? 'transfer' : 'new'}`)
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white">
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
        <h1 className="text-4xl font-semibold tracking-tight">Weight Loss Assessment</h1>

        <div className="mt-6 space-y-4 text-gray-700 leading-relaxed">
          <p>
            To ensure you receive the most effective treatment from our healthcare professional please answer the
            questions honestly and accurately. The questionnaire should take about three minutes.
          </p>
          <p>
            If you are unsure about any question call us on 01924 971414 or email enquiries at info@pharmacy-express.co.uk
          </p>
        </div>

        {(() => {
          try {
            const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
            const dbg = sp.get('debug') === '1'
            if (!dbg) return null
            const s = sp.get('session') || (sessionId ? String(sessionId) : '0')
            const f = sp.get('form') || (formId ? String(formId) : '0')
            return (
              <div className="mt-4 text-xs text-gray-500">
                intake debug · api: {apiBase} · kind: {kind} · session: {s} · form: {f}
                {sessDiag ? <>
                  <br />
                  <span className="text-[11px] text-gray-400">{sessDiag}</span>
                </> : null}
              </div>
            )
          } catch { return null }
        })()}

        <div className="mt-10 border border-gray-200 rounded-none shadow-sm">
          <div className="px-5 py-6">
            <WeightAssessmentStepper
              value={assessment}
              onChange={setAssessment}
              onSubmit={submit}
              onProgress={handleProgress}
              hideTabs={false}
              hideNav
              onSectionLabel={setSectionLabel}
            />
          </div>
        </div>

        {error && <div className="mt-4 text-red-600">{error}</div>}
        {sending && <div className="mt-2 text-gray-600">Submitting</div>}
      </div>
    </div>
  )
}
