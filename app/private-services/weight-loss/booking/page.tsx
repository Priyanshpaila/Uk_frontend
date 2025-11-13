'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
// (Optional) If you later want to close via context instead of DOM:
// import { useCart } from '@/components/cart-context'
import { useRouter, useSearchParams } from 'next/navigation'
import RequireAuth from '@/components/RequireAuth'

export default function BookingPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="p-6">Loading booking…</div>}>
        <BookingInner />
      </Suspense>
    </RequireAuth>
  )
}

function BookingInner() {
  const router = useRouter()
  const [identity, setIdentity] = useState({ name: '', email: '' })
  const [widgetReady, setWidgetReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // lightweight debug strip via ?debug=1
  const showDebug = (() => {
    try {
      if (typeof window === 'undefined') return false
      const p = new URLSearchParams(window.location.search)
      return p.get('debug') === '1'
    } catch {
      return false
    }
  })()

  // read ?type=new|transfer (default consultation)
  const searchParams = useSearchParams();
  const rawType = (searchParams?.get('type') || '').toLowerCase();
  const type = ['new', 'transfer', 'current', 'consultation'].includes(rawType)
    ? (rawType as 'new' | 'transfer' | 'current' | 'consultation')
    : 'consultation';

  // Ensure no cart/backdrop overlays block Calendly and seed treatment from cart
  useEffect(() => {
    try {
      // a) Close any drawer that listens for Escape
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      // b) Click a typical backdrop if present
      const backdrop = document.querySelector('div.fixed.inset-0.bg-black\\/40') as HTMLElement | null
      backdrop?.click()
      // c) Only seed treatment from cart for assessment-driven flows, not plain consultation
      if (type !== 'consultation') {
        const raw = localStorage.getItem('cart')
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            const items = Array.isArray(parsed?.items) ? parsed.items : []
            if (items.length) {
              // collect all treatments from cart
              const treatments: string[] = items
                .map((row: any) => {
                  const name = String(row?.name || '').trim()
                  const opt  = String(row?.optionLabel || '').trim()
                  return opt ? `${name} ${opt}` : name
                })
                .filter(Boolean)

              // store the first for back-compat and the full list for multi-item flows
              const first = treatments[0] || ''
              if (first) {
                localStorage.setItem('treatment_name', first)
                localStorage.setItem('selected_treatment', first)
              }
              if (treatments.length) {
                sessionStorage.setItem('pe_selected_treatments', JSON.stringify(treatments))
              }
            }
          } catch { /* ignore */ }
        }
      } else {
        // for consultation-only path, clear any stale treatment so checkout doesn't show maintenance dose
        try {
          localStorage.removeItem('treatment_name')
          localStorage.removeItem('selected_treatment')
          sessionStorage.removeItem('pe_selected_treatments')
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, [type])

  const backUrl = useMemo(() => {
    // If assessment-driven booking, go back to the appropriate treatments flow
    if (type === 'new' || type === 'transfer' || type === 'current') {
      return `/private-services/weight-loss/treatments?type=${type}`
    }
    // Otherwise this was launched from Book a consultation tab
    return '/private-services/weight-loss'
  }, [type])

  // read identity saved at registration/login
  useEffect(() => {
    try {
      setIdentity({
        name: localStorage.getItem('patient_name') || '',
        email: localStorage.getItem('patient_email') || '',
      })
    } catch {
      // ignore
    }
  }, [])

  // your Calendly event link
  const base = process.env.NEXT_PUBLIC_CALENDLY_EVENT_URL || 'https://calendly.com/pharmacyexpress/30min'

  // build url with prefill + brand colour
  const calendlyUrl = useMemo(() => {
    const url = new URL(base)
    if (identity.name) url.searchParams.set('name', identity.name)
    if (identity.email) url.searchParams.set('email', identity.email)
    url.searchParams.set('hide_gdpr_banner', '1')
    url.searchParams.set('primary_color', '00d1b2')
    return url.toString()
  }, [base, identity])

  // load Calendly widget script once
  useEffect(() => {
    const id = 'calendly-script'
    if (document.getElementById(id)) {
      setWidgetReady(true)
      // ensure the inline widget reflows if a backdrop previously covered it
      requestAnimationFrame(() => {
        const el = document.querySelector('.calendly-inline-widget') as HTMLElement | null
        if (el) el.style.display = 'block'
      })
      return
    }
    const s = document.createElement('script')
    s.id = id
    s.src = 'https://assets.calendly.com/assets/external/widget.js'
    s.async = true
    s.onload = () => setWidgetReady(true)
    s.onerror = () => setError('Failed to load booking widget')
    document.body.appendChild(s)
  }, [])

  // when a slot is booked, Calendly posts message `calendly.event_scheduled`
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      // Only trust messages from Calendly
      if (typeof e.origin !== 'string' || !e.origin.startsWith('https://calendly.com')) return;

      const data = e.data as unknown;
      if (typeof data !== 'object' || data === null) return;

      const evt = (data as { event?: string }).event;
      if (evt !== 'calendly.event_scheduled') return;

      const payload = (data as {
        payload?: { event?: { uri?: string }; invitee?: { uri?: string } };
      }).payload;

      const calendlyEventUri = payload?.event?.uri ?? '';
      const inviteeUri = payload?.invitee?.uri ?? '';

      try {
        localStorage.setItem('cal_event_uri', calendlyEventUri);
        localStorage.setItem('cal_invitee_uri', inviteeUri);
      } catch {
        // ignore storage failures
      }

      // pick up treatment stored from cart (if present)
      let treatmentName = ''
      try {
        treatmentName =
          localStorage.getItem('treatment_name') ||
          localStorage.getItem('selected_treatment') ||
          ''
      } catch { /* ignore */ }

      // go to checkout page to choose payment method
      const q = new URLSearchParams({
        type,
        bookingId: calendlyEventUri || '',
        invitee: inviteeUri || '',
      })

      // carry forward the consultation session id captured during intake
      try {
        const sid =
          (localStorage.getItem('consultation_session_id') ||
            sessionStorage.getItem('consultation_session_id') ||
            localStorage.getItem('pe_consultation_session_id') ||
            sessionStorage.getItem('pe_consultation_session_id') ||
            '').trim()
        if (sid) q.set('sessionId', sid)
      } catch {
        // ignore storage failures
      }

      // Prefer multi-item list from sessionStorage; fall back to single treatmentName
      try {
        const stored = sessionStorage.getItem('pe_selected_treatments')
        const arr: string[] = stored ? JSON.parse(stored) : []
        if (Array.isArray(arr) && arr.length) {
          arr.forEach(t => {
            const v = String(t || '').trim()
            if (v) q.append('treatment', v)
          })
        } else if (type !== 'consultation' && treatmentName) {
          q.append('treatment', treatmentName)
        }
      } catch {
        if (type !== 'consultation' && treatmentName) q.append('treatment', treatmentName)
      }

      try { console.debug('[booking] navigating to checkout with', q.toString()) } catch {}
      router.push(`/private-services/weight-loss/checkout?${q.toString()}`)
    }

    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [type, router])

  const firstName = identity.name?.split(' ')[0] || 'there'

  return (
    <main className="bg-white">
      <div className="border-b border-emerald-400 bg-zinc-50 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push(backUrl)}
          className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-900 font-medium rounded-full border border-emerald-400 px-4 py-2"
        >
          <span className="text-lg">←</span>
          <span>Back</span>
        </button>
      </div>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-white" />
        <div className="relative max-w-6xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          {showDebug && (
            <div className="text-xs bg-gray-900 text-white rounded px-3 py-2 inline-block">
              type {type} • widget {widgetReady ? 'ready' : 'loading'} • name {identity.name || '—'} • email {identity.email || '—'}
            </div>
          )}
          {type === 'consultation' ? (
            <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
              Book your consultation{identity.name ? `, ${firstName}` : ''}.
            </h1>
          ) : (
            <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
              Thank you for completing your assessment{identity.name ? `, ${firstName}` : ''}.
            </h1>
          )}
          {type === 'new' && (
            <p className="mt-3 max-w-3xl text-lg text-zinc-700">
              Because you’re a <strong>new patient</strong>, please book a quick online consultation with one of our pharmacists.
              It only takes a few minutes and ensures your treatment is safe and tailored to you.
            </p>
          )}
          {type === 'transfer' && (
            <p className="mt-3 max-w-3xl text-lg text-zinc-700">
              Because you’re <strong>transferring</strong> to us, please book a short online consultation so we can safely take over
              your care and confirm your current dose.
            </p>
          )}
          {type === 'current' && (
            <p className="mt-3 max-w-3xl text-lg text-zinc-700">
              As an <strong>existing patient</strong>, please book a brief check-in so we can review your progress and continue supply.
            </p>
          )}
          {type === 'consultation' && (
            <p className="mt-3 max-w-3xl text-lg text-zinc-700">
              Please book a <strong>consultation</strong> at a time that suits you. We’ll review your information and advise on the best next steps.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-600">
            <Badge>Video Call</Badge>
            <Badge>Secure &amp; confidential</Badge>
            <Badge>Flexible times</Badge>
            {identity.email && <Badge>Prefilled: {identity.email}</Badge>}
          </div>
        </div>
      </section>

      {/* Main two-column layout */}
      <section className="max-w-6xl mx-auto px-4 lg:px-6 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Calendly card */}
          <div className="rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50">
              <h2 className="text-lg font-medium">Choose a time that suits you</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Availability updates in real time. Your name and email are prefilled to speed things up.
              </p>
            </div>

            {/* Widget / skeleton */}
            {!widgetReady && (
              <div className="p-6">
                <SkeletonLine />
                <SkeletonLine className="w-3/4 mt-2" />
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SkeletonBlock />
                  <SkeletonBlock />
                  <SkeletonBlock className="hidden md:block" />
                  <SkeletonBlock className="hidden md:block" />
                </div>
                <p className="mt-6 text-sm text-zinc-500">
                  Loading booking calendar… If it doesn’t appear,{' '}
                  <a className="underline" href={calendlyUrl} target="_blank" rel="noreferrer">
                    open in a new tab
                  </a>.
                </p>
              </div>
            )}

            <div
              className="calendly-inline-widget"
              data-url={calendlyUrl}
              style={{ minWidth: '320px', height: '900px', visibility: widgetReady ? 'visible' : 'hidden' }}
            />
          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">
            <Panel title="What happens next?">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-700">
                <li>Pick a date and time for your consultation.</li>
                <li>We’ll email you a confirmation with a secure video link.</li>
                <li>After you schedule, you’ll be taken to our checkout page to choose card or Apple Pay.</li>
              </ol>
            </Panel>

            <Panel title="Helpful tips">
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
                <li>Join from a quiet, well-lit place. Headphones help.</li>
                <li>Have a valid photo ID ready if requested.</li>
                <li>Need to reschedule? Use the link in your email—no need to call.</li>
              </ul>
            </Panel>

            <Panel title="Need help?">
              <div className="text-sm text-zinc-700 space-y-2">
                <p>
                  Email{' '}
                  <a className="underline text-emerald-700" href="mailto:info@pharmacy-express.co.uk">
                    info@pharmacy-express.co.uk
                  </a>
                </p>
                <p>
                  Call{' '}
                  <a className="underline text-emerald-700" href="tel:01924971414">
                    01924 971414
                  </a>
                </p>
              </div>
            </Panel>

            <Panel title="Privacy">
              <p className="text-sm text-zinc-700">
                Your information is used only to schedule and conduct your consultation in line with our{' '}
                <a className="underline text-emerald-700" href="/privacy" target="_blank" rel="noreferrer">
                  Privacy Policy
                </a>
                .
              </p>
            </Panel>
          </aside>
        </div>
      </section>

      {/* Fallback for no-JS users */}
      <noscript>
        <div className="max-w-3xl mx-auto px-4 lg:px-6 pb-14">
          <div className="rounded-md border border-zinc-200 p-4">
            Please enable JavaScript to load the booking widget. You can also book using{' '}
            <a className="underline" href={calendlyUrl} target="_blank" rel="noreferrer">
              this direct link
            </a>
            .
          </div>
        </div>
      </noscript>

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-full bg-rose-600 text-white px-4 py-2 shadow">{error}</div>
        </div>
      )}
    </main>
  )
}

/* ---------- little UI helpers ---------- */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2.5 py-1 text-xs">
      {children}
    </span>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`h-4 bg-zinc-200/70 rounded animate-pulse ${className}`} />
}
function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`h-24 bg-zinc-200/70 rounded animate-pulse ${className}`} />
}
