'use client'

import { useState, useEffect } from 'react'
import type { WeightAssessment } from '@/forms/weightLossSchema'

type Props = {
  value: WeightAssessment
  onChange: (next: WeightAssessment) => void
  onComplete?: () => void
  onBack?: () => void
  onMeta?: (m: { current?: number; total?: number; label?: string }) => void
}

export default function PastHistory({ value, onChange, onComplete, onBack }: Props) {
  const [q, setQ] = useState(0)
  const advanceTo = (n: number) => setQ((i) => (i >= n ? i : n))
  // Derive current step from saved answers so refresh shows the right cards automatically
  useEffect(() => {
    try {
      let next = 0;

      // 21. Kidney/Liver impairment
      if (typeof (value as any).kidney_or_liver_impairment === 'boolean') {
        if ((value as any).kidney_or_liver_impairment === false) {
          next = Math.max(next, 1);
        } else {
          const t = (((value as any).kidney_or_liver_impairment_text || '') + '').trim();
          if (t.length > 0) next = Math.max(next, 1);
        }
      }

      // 22. Other medical conditions
      if (typeof (value as any).other_medical_conditions_yes === 'boolean') {
        if ((value as any).other_medical_conditions_yes === false) {
          next = Math.max(next, 2);
        } else {
          const t = (((value as any).other_medical_conditions_text || '') + '').trim();
          if (t.length > 0) next = Math.max(next, 2);
        }
      }

      // 23. Current/recent meds
      if (typeof (value as any).current_or_recent_meds_yes === 'boolean') {
        if ((value as any).current_or_recent_meds_yes === false) {
          next = Math.max(next, 3);
        } else {
          const t = (((value as any).current_or_recent_meds_text || '') + '').trim();
          if (t.length > 0) next = Math.max(next, 3);
        }
      }

      // 24. Allergies
      if (typeof (value as any).allergies_yes === 'boolean') {
        if ((value as any).allergies_yes === false) {
          next = Math.max(next, 4);
        } else {
          const t = (((value as any).allergies_text || '') + '').trim();
          if (t.length > 0) next = Math.max(next, 4);
        }
      }

      // 25. GP Details – require: picked from list (gp_selected), name/address present, valid email and submitted
      const hasGpNameAddr = !!(((value as any).gp_name && (value as any).gp_address) || (((value as any).gp_name_address || '') + '').trim());
      const gpPicked    = (value as any).gp_selected === true;
      const gpEmailOK   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((((value as any).gp_email || '') + '').trim());
      const gpSubmitted = (value as any).gp_email_submitted === true;
      if (hasGpNameAddr && gpPicked && gpEmailOK && gpSubmitted) {
        // This is the last card; keep q at 4 so the section stays visible
        next = Math.max(next, 4);
      }

      setQ((i) => (i >= next ? i : next));
    } catch {}
  }, [value]);

  // hydrate GP fields from storage on mount (fallback if parent debounce hasn’t saved yet)
  useEffect(() => {
    try {
      const raw = (typeof window !== 'undefined' && (sessionStorage.getItem('pe_weight_pasthistory') || localStorage.getItem('pe_weight_pasthistory_local'))) || null
      if (!raw) return
      const saved = JSON.parse(raw)
      if (!saved || typeof saved !== 'object') return

      const next: any = { ...(value as any) }
      const keys = [
        'gp_selected','gp_name','gp_address','gp_name_address','gp_ods_code','gp_email','gp_email_submitted',
        'kidney_or_liver_impairment','kidney_or_liver_impairment_text',
        'other_medical_conditions_yes','other_medical_conditions_text',
        'current_or_recent_meds_yes','current_or_recent_meds_text',
        'allergies_yes','allergies_text',
      ]
      let changed = false
      for (const k of keys) {
        if ((next as any)[k] === undefined || (next as any)[k] === null || (next as any)[k] === '') {
          if (saved[k] !== undefined) { (next as any)[k] = saved[k]; changed = true }
        }
      }
      if (changed) {
        onChange(next)
        if ((saved.gp_name_address || '').trim()) {
          setGpMode('locked')
          setSearchQ(saved.gp_name_address)
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // debounce save all of this step to storage
  useEffect(() => {
    try {
      const id = setTimeout(() => {
        try { sessionStorage.setItem('pe_weight_pasthistory', JSON.stringify(value ?? {})) } catch {}
        try { localStorage.setItem('pe_weight_pasthistory_local',   JSON.stringify(value ?? {})) } catch {}
      }, 150)
      return () => clearTimeout(id)
    } catch {}
  }, [value])
  const setV = (patch: Partial<WeightAssessment> | Record<string, any>) =>
    onChange({ ...(value as any), ...(patch as any) })

  // ---- immediate persistence to survive refreshes (Safari/Incognito safe) ----
  const STORAGE_KEY_SESSION = 'pe_weight_pasthistory'
  const STORAGE_KEY_LOCAL   = 'pe_weight_pasthistory_local'
  const persistNow = (patch?: Partial<WeightAssessment> | Record<string, any>) => {
    try {
      const next: any = { ...(value as any), ...(patch as any) }
      if (typeof window !== 'undefined') {
        try { sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(next ?? {})) } catch {}
        try { localStorage.setItem(STORAGE_KEY_LOCAL,   JSON.stringify(next ?? {})) } catch {}
      }
    } catch {}
  }
  // GP search state
  type GpMode = 'editing' | 'locked'
  const [gpMode, setGpMode] = useState<GpMode>(
    ((value as any).gp_name_address || '').trim() ? 'locked' : 'editing'
  )
  const [searchQ, setSearchQ] = useState<string>((value as any).gp_name_address || '')
  const [suggests, setSuggests] = useState<Array<{ id: string; name: string; address: string }>>([])
  const [loading, setLoading] = useState(false)
  const [gpError, setGpError] = useState<string | null>(null)
  const MIN_Q = 2;

  // effect: only search while editing and 2+ chars
  useEffect(() => {
    if (gpMode !== 'editing') return
    const q = searchQ.trim()
    if (q.length < MIN_Q) { setSuggests([]); setGpError(null); return }

    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        setLoading(true)
        setGpError(null)
        const res = await fetch(`/api/gp-search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
          cache: 'no-store',
        })
        const data = await res.json()
        if (data?.ok === false) {
          setSuggests([])
          setGpError('Search temporarily unavailable. Please try again.')
          return
        }
        setSuggests(Array.isArray(data?.items) ? data.items : [])
      } catch (err: any) {
        if (err?.name !== 'AbortError') setGpError('Network error. Please try again.')
        setSuggests([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => { clearTimeout(t); ctrl.abort() }
  }, [searchQ, gpMode])

  // debounce/lookup GP practices
  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(((value as any).gp_email || '').trim())
  // auto-complete entire step once GP address & valid email are present
  

  return (
    <div className="space-y-6">
      {/* 21. Kidney/Liver impairment — auto-advance */}
      <Card>
        <Row>
          <Q>Do you have any kidney or liver impairment?</Q>
          <Right>
            <Pill
              active={(value as any).kidney_or_liver_impairment === true}
              onClick={() => setV({ kidney_or_liver_impairment: true } as any)}
            >
              Yes
            </Pill>
            <Pill
              active={(value as any).kidney_or_liver_impairment === false}
              onClick={() => {
                setV({ kidney_or_liver_impairment: false, kidney_or_liver_impairment_text: '' } as any)
                setTimeout(() => advanceTo(1), 120)
              }}
            >
              No
            </Pill>
          </Right>
        </Row>

        {(value as any).kidney_or_liver_impairment === true && (
          <>
            <Label className="mt-3">Please provide more details:</Label>
            <textarea
              rows={3}
              className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
              value={(value as any).kidney_or_liver_impairment_text || ''}
              onChange={(e) => setV({ kidney_or_liver_impairment_text: e.target.value } as any)}
              onBlur={(e) => {
                if ((e.target.value || '').trim()) setTimeout(() => advanceTo(1), 120)
              }}
            />
          </>
        )}
      </Card>

      {/* 22. Other medical conditions — auto-advance */}
      <Reveal show={q >= 1}>
        <Card>
          <Row>
            <Q>
              Do you have any other medical conditions (e.g. cancer) or past surgical procedures (e.g.
              splenectomy)?
            </Q>
            <Right>
              <Pill
                active={(value as any).other_medical_conditions_yes === true}
                onClick={() => setV({ other_medical_conditions_yes: true } as any)}
              >
                Yes
              </Pill>
              <Pill
                active={(value as any).other_medical_conditions_yes === false}
                onClick={() => {
                  setV({ other_medical_conditions_yes: false, other_medical_conditions_text: '' } as any)
                  setTimeout(() => advanceTo(2), 120)
                }}
              >
                No
              </Pill>
            </Right>
          </Row>

          {(value as any).other_medical_conditions_yes === true && (
            <>
              <Label className="mt-3">Please provide more details:</Label>
              <textarea
                rows={3}
                className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                value={(value as any).other_medical_conditions_text || ''}
                onChange={(e) => setV({ other_medical_conditions_text: e.target.value } as any)}
                onBlur={(e) => {
                  if ((e.target.value || '').trim()) setTimeout(() => advanceTo(2), 120)
                }}
              />
            </>
          )}
        </Card>
      </Reveal>

      {/* 23. Current/recent meds — auto-advance */}
      <Reveal show={q >= 2}>
        <Card>
          <Row>
            <Q>
              Are you currently taking or recently stopped taking any prescription medicines, over-the-counter
              medicines, herbal medicines or recreational drugs?
            </Q>
            <Right>
              <Pill
                active={(value as any).current_or_recent_meds_yes === true}
                onClick={() => setV({ current_or_recent_meds_yes: true } as any)}
              >
                Yes
              </Pill>
              <Pill
                active={(value as any).current_or_recent_meds_yes === false}
                onClick={() => {
                  setV({ current_or_recent_meds_yes: false, current_or_recent_meds_text: '' } as any)
                  setTimeout(() => advanceTo(3), 120)
                }}
              >
                No
              </Pill>
            </Right>
          </Row>

          {(value as any).current_or_recent_meds_yes === true && (
            <>
              <Label className="mt-3">Please provide more details:</Label>
              <textarea
                rows={3}
                className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                value={(value as any).current_or_recent_meds_text || ''}
                onChange={(e) => setV({ current_or_recent_meds_text: e.target.value } as any)}
                onBlur={(e) => {
                  if ((e.target.value || '').trim()) setTimeout(() => advanceTo(3), 120)
                }}
              />
            </>
          )}
        </Card>
      </Reveal>

      {/* 24. Allergies — auto-advance */}
      <Reveal show={q >= 3}>
        <Card>
          <Row>
            <Q>Are you allergic to any medicines or other substances e.g. peanuts or soya?</Q>
            <Right>
              <Pill
                active={(value as any).allergies_yes === true}
                onClick={() => setV({ allergies_yes: true } as any)}
              >
                Yes
              </Pill>
              <Pill
                active={(value as any).allergies_yes === false}
                onClick={() => {
                  setV({ allergies_yes: false, allergies_text: '' } as any)
                  setTimeout(() => advanceTo(4), 120)
                }}
              >
                No
              </Pill>
            </Right>
          </Row>

          {(value as any).allergies_yes === true && (
            <>
              <Label className="mt-3">Please provide more details:</Label>
              <textarea
                rows={3}
                className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                value={(value as any).allergies_text || ''}
                onChange={(e) => setV({ allergies_text: e.target.value } as any)}
                onBlur={(e) => {
                  if ((e.target.value || '').trim()) setTimeout(() => advanceTo(4), 120)
                }}
              />
            </>
          )}
        </Card>
      </Reveal>

      {/* 25. GP details — select from list, no Done; auto-complete when valid */}
      <Reveal show={q >= 4}>
        <Card>
          <Q>We need to let your GP know about your treatment to ensure you get the best level of care possible.</Q>
          <br/>
          <Q>Please provide us your GP details.</Q>

          <div className="grid gap-4 md:grid-cols-[1fr,360px] mt-4 items-start">
            {/* LEFT: practice search */}
            <div>
              <p className="text-sm text-gray-700">Search the name and address of your GP</p>

              <input
                className="mt-2 w-full border rounded-md p-2 disabled:opacity-60"
                placeholder="Start typing the GP practice name…"
                value={searchQ}
                disabled={gpMode === 'locked'}
                onChange={(e) => {
                  setSearchQ(e.target.value)
                  setV({ gp_name_address: e.target.value, gp_selected: false } as any)
                  persistNow({ gp_name_address: e.target.value, gp_selected: false } as any)
                }}
              />

              {/* status row */}
              {gpMode === 'locked' ? (
                <div className="mt-2 text-sm">
                  <p className="font-medium text-gray-900">
                    {(value as any).gp_name || searchQ}
                  </p>
                  {(value as any).gp_address ? (
                    <p className="text-gray-600 whitespace-pre-wrap leading-snug">{(value as any).gp_address}</p>
                  ) : (
                    (value as any).gp_name_address ? (
                      <p className="text-gray-600 whitespace-pre-wrap leading-snug">{(value as any).gp_name_address}</p>
                    ) : null
                  )}
                  {Boolean((value as any).gp_ods_code) && (
                    <p className="text-xs text-gray-500 mt-1">ODS: {(value as any).gp_ods_code}</p>
                  )}
                  <button
                    type="button"
                    className="mt-1 underline text-emerald-700"
                    onClick={() => {
                      setGpMode('editing')
                      setSuggests([])
                      setV({
                        gp_selected: false,
                        gp_name: undefined,
                        gp_address: undefined,
                        gp_name_address: '',
                        gp_ods_code: undefined,
                      } as any)
                      setSearchQ('')
                      persistNow({
                        gp_selected: false,
                        gp_name: undefined,
                        gp_address: undefined,
                        gp_name_address: '',
                        gp_ods_code: undefined,
                      } as any)
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : searchQ.trim().length >= MIN_Q ? (
                <p className="mt-2 text-sm">
                  {loading
                    ? 'Searching…'
                    : suggests.length
                    ? 'Do you mean any of these?'
                    : 'No matches yet'}
                </p>
              ) : null}

              {gpError && <p className="mt-2 text-sm text-rose-700">{gpError}</p>}
              {/* suggestions */}
              {gpMode === 'editing' && suggests.length > 0 && (
                <div className="mt-2 border rounded-md divide-y max-h-72 overflow-auto">
                  {suggests.map((s) => {
                    const line = `${s.name}${s.address ? ' – ' + s.address : ''}`
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left p-3 hover:bg-gray-50"
                        onClick={() => {
                          setSearchQ(line)
                          setSuggests([])
                          setGpMode('locked')
                          const patch: any = {
                            gp_selected: true,
                            gp_name: s.name,
                            gp_address: s.address || '',
                            gp_name_address: line,
                            gp_ods_code: s.id, // persist ODS/ID for later use
                          }
                          setV(patch)
                          persistNow(patch)
                        }}
                      >
                        <p className="font-medium leading-snug">{s.name}</p>
                        {s.address ? (
                          <p className="text-sm text-gray-600 whitespace-normal leading-snug">{s.address}</p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Address unavailable</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              <p className="mt-3 text-sm">
                Unable to find your surgery?{' '}
                <a className="underline text-emerald-700" href="https://www.nhs.uk/service-search/find-a-gp" target="_blank" rel="noreferrer">
                  Click here
                </a>
              </p>
            </div>

            {/* RIGHT: email capture */}
            <div>
              <p className="text-sm text-gray-700">Please Provide GP Email (preferred):</p>
              <input
                type="email"
                className="mt-2 w-full border rounded-md p-2"
                placeholder="name@practice.nhs.uk"
                value={(value as any).gp_email || ''}
                onChange={(e) => { setV({ gp_email: e.target.value } as any); persistNow({ gp_email: e.target.value } as any) }}
              />
              <button
                type="button"
                onClick={() => { setV({ gp_email_submitted: true } as any); persistNow({ gp_email_submitted: true } as any) }}
                disabled={!emailOk || gpMode !== 'locked'}
                className="mt-2 w-full md:w-auto px-4 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                Submit Email
              </button>
              {(value as any).gp_email_submitted === true && (
                <p className="mt-2 text-xs text-emerald-700">Email saved.</p>
              )}
            </div>
          </div>
        </Card>
      </Reveal>

      {(onBack || onComplete) && (
        <div className="mt-8 flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={() => onBack?.()}
              className="px-4 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              Back
            </button>
          ) : (
            <span />
          )}

          {isPastHistoryComplete(value) && (
            <button
              type="button"
              onClick={() => onComplete?.()}
              className="px-6 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Forward
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- UI helpers ---------- */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white-50 p-6">{children}</div>
}
function Q({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-gray-800">{children}</p>
}
function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-700 ${className}`}>{children}</p>
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">{children}</div>
}
function Right({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 md:justify-end items-center">{children}</div>
}
function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-6 py-2 rounded-full border text-sm ${
        active
          ? 'bg-emerald-600 border-emerald-600 text-white'
          : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}
function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`transition-all duration-200 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none hidden'
      }`}
    >
      {children}
    </div>
  )
}

/* ---------- completion check (1 point per card) ---------- */

function isPastHistoryComplete(v: any): boolean {
  const kOK = typeof v.kidney_or_liver_impairment === 'boolean' &&
              (v.kidney_or_liver_impairment === false || !!(v.kidney_or_liver_impairment_text || '').trim())

  const otherOKYN = typeof v.other_medical_conditions_yes === 'boolean'
  const otherOK   = v.other_medical_conditions_yes === false || !!(v.other_medical_conditions_text || '').trim()

  const recentOKYN = typeof v.current_or_recent_meds_yes === 'boolean'
  const recentOK   = v.current_or_recent_meds_yes === false || !!(v.current_or_recent_meds_text || '').trim()

  const allergyOKYN = typeof v.allergies_yes === 'boolean'
  const allergyOK   = v.allergies_yes === false || !!(v.allergies_text || '').trim()

  const hasGpNameAddr = !!((v.gp_name && v.gp_address) || (v.gp_name_address || '').trim())
  const gpPicked      = v.gp_selected === true
  const gpEmailOK     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v.gp_email || '').trim())
  const gpSubmitted   = v.gp_email_submitted === true

  // Require: GP chosen (picked), email valid, and user pressed Submit
  return kOK && otherOKYN && otherOK && recentOKYN && recentOK && allergyOKYN && allergyOK &&
          hasGpNameAddr && gpPicked && gpEmailOK && gpSubmitted
}