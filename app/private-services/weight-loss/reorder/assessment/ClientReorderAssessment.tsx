'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import GpPicker from '@/components/gp-picker'
import ReorderPayBox from '@/components/ReorderPayBox'

type YesNo = true | false | null
type RefillSlug = 'mounjaro-refill' | 'wegovy-refill' 

function isRefillSlug(s: string): s is RefillSlug {
  return s === 'mounjaro-refill' || s === 'wegovy-refill'
}

type ReorderAssessment = {
  gp_selected?: boolean
  gp_name?: string
  gp_address?: string
  gp_name_address?: string
  gp_ods_code?: string
  gp_email?: string
  gp_email_submitted?: boolean
  current_weight?: string
  tolerated_current_dose?: boolean
  tolerated_text?: string
  side_effects_yes?: boolean
  side_effects_text?: string
  scale_images?: Array<{ name: string; size: number }>
}

type Search = Record<string, string | string[] | undefined>

function paramIsTrue(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v
  const t = (s || '').toString().toLowerCase()
  return t === '1' || t === 'true' || t === 'yes'
}

/* prices */
const PRICES: Record<
  RefillSlug,
  { labels: string[]; prices: number[] }
> = {
  'mounjaro-refill': {
    labels: [
      '2.5mg Starter Pack Needles Swabs Sharps bin',
      '2.5mg and 5mg Starter Pack',
      '2.5mg',
      '5mg',
      '7.5mg',
      '10mg',
      '12.5mg',
      '15mg',
    ],
    prices: [169.99, 338.0, 144.99, 164.99, 224.99, 244.99, 264.99, 284.99],
  },
  'wegovy-refill': {
    labels: ['0.25mg', '0.5mg', '1mg', '1.7mg', '2.4mg'],
    prices: [99.49, 104.49, 114.49, 159.99, 209.99],
  },
}

function getAmountMinor(slug: RefillSlug, optionIndex: number, qty: number): number | null {
  const table = PRICES[slug]
  if (!table) return null
  if (optionIndex < 0 || optionIndex >= table.prices.length) return null
  const unitMajor = table.prices[optionIndex]
  const totalMajor = unitMajor * Math.max(1, qty)
  return Math.round(totalMajor * 100)
}

export default function ClientReorderAssessment({ initialSearch }: { initialSearch: Search }) {
  const search = useSearchParams();
  // Prefer client URL query (works even if an auth layer strips params during SSR),
  // then fall back to the server-provided initialSearch.
  const slugRaw = (search?.get('slug') ?? (
    Array.isArray(initialSearch.slug)
      ? initialSearch.slug[0]
      : (initialSearch.slug as string | undefined)
  )) ?? ''
  const slugParam = slugRaw.toString().trim().toLowerCase()
  const slug: RefillSlug | null = isRefillSlug(slugParam) ? (slugParam as RefillSlug) : null

  const optionRaw = (search?.get('option') ?? (
    Array.isArray(initialSearch.option)
      ? initialSearch.option[0]
      : (initialSearch.option as string | undefined)
  )) ?? '0'
  const optionIndexNum = Number(optionRaw)

  const qtyRaw = (search?.get('qty') ?? (
    Array.isArray(initialSearch.qty)
      ? initialSearch.qty[0]
      : (initialSearch.qty as string | undefined)
  )) ?? '1'
  const qtyNum = Number(qtyRaw)

  // clamp indices once so we use the same safe values everywhere
  const safeIndex = useMemo(() => {
    const ix = Number.isFinite(optionIndexNum) ? optionIndexNum : 0
    if (!slug) return 0
    const max = PRICES[slug].labels.length - 1
    return Math.max(0, Math.min(ix, max))
  }, [optionIndexNum, slug])

  const safeQty = useMemo(() => {
    const q = Number.isFinite(qtyNum) ? qtyNum : 1
    return Math.max(1, q)
  }, [qtyNum])

  // dev bypass: skip long form and show pay box only when ?dev=1 (never in production)
  const devMode = paramIsTrue(initialSearch.dev) && process.env.NODE_ENV !== 'production'


  /* BMI inputs */
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const weightOK = weight.trim().length > 0
  const heightOK = height.trim().length > 0
  const [metricH, setMetricH] = useState(true)
  const [metricW, setMetricW] = useState(true)

  useEffect(() => {
  try {
    const savedEmail = localStorage.getItem('patient_email');
    if (savedEmail && !form.gp_email) {
      setV({ gp_email: savedEmail, gp_selected: true });
    }
    const savedName = localStorage.getItem('patient_name');
    // If you want to use it later, you can keep it; not displayed here
  } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const bmi = useMemo(() => {
    const h = parseFloat(height)
    const w = parseFloat(weight)
    if (!isNaN(h) && !isNaN(w) && h > 0 && w > 0) {
      const hM = metricH ? h / 100 : h * 0.0254
      const wKg = metricW ? w : w * 0.453592
      return wKg / (hM * hM)
    }
    return null
  }, [height, weight, metricH, metricW])

  /* form state */
  const [ack, setAck] = useState(false)

  type UImg = { url: string; file: File }
  const [images, setImages] = useState<UImg[]>([])
  const haveImages = images.length > 0

  const [tolerated, setTolerated] = useState<YesNo>(null)
  const [toleratedNotes, setToleratedNotes] = useState('')
  const [hadSides, setHadSides] = useState<YesNo>(null)
  const [sideNotes, setSideNotes] = useState('')
  // progressive reveal gates
  const showBMI = ack === true
  const showImages = showBMI && heightOK && weightOK
  const toleratedDone = tolerated !== null && (tolerated !== false || toleratedNotes.trim().length > 0)
  const showTolerated = showImages
  const showSides = showImages && toleratedDone
  const hadSidesDone = hadSides !== null && (hadSides !== true || sideNotes.trim().length > 0)
  const showGP = showSides && hadSidesDone

  const [form, setForm] = useState<ReorderAssessment>({
    gp_selected: false,
    gp_name_address: '',
    gp_email: '',
  })

  const setV = (patch: Partial<ReorderAssessment>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  /* uploads */
  function onFiles(files: FileList | null) {
    if (!files || !files.length) return
    const next: UImg[] = []
    for (const f of Array.from(files)) {
      const url = URL.createObjectURL(f)
      next.push({ url, file: f })
    }
    setImages((prev) => [...prev, ...next])
  }
  function removeImg(idx: number) {
    setImages((prev) => {
      const x = [...prev]
      const [rm] = x.splice(idx, 1)
      if (rm) URL.revokeObjectURL(rm.url)
      return x
    })
  }

  /* validation */
  const ok = useMemo(() => {
    if (!ack) return false
    if (!heightOK) return false
    if (!weightOK) return false
    if (!haveImages) return false
    if (tolerated === null) return false
    if (hadSides === null) return false
    if (tolerated === false && !toleratedNotes.trim()) return false
    if (hadSides === true && !sideNotes.trim()) return false
    if (!form.gp_selected) return false
    if (!form.gp_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.gp_email)) return false
    if (!form.gp_email_submitted) return false
    if (slug === null) return false
    return true
  }, [ack, heightOK, weightOK, haveImages, tolerated, toleratedNotes, hadSides, sideNotes, form, slug])

  if (devMode) {
    const s: RefillSlug = slug || 'wegovy-refill'
    const labels = PRICES[s].labels
    const label = labels[safeIndex] || ''
    const totalPence = getAmountMinor(s, safeIndex, safeQty) ?? 2999
    const bookingRef =
      (Array.isArray(initialSearch.booking)
        ? initialSearch.booking[0]
        : (initialSearch.booking as string | undefined)) || ''

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <p className="text-sm text-emerald-700">
            Dev bypass active (hidden in production). Only the payment box is shown.
          </p>
          <ReorderPayBox
            assessmentId="reorder-dev"
            customerEmail="dev@local.test"
            summary={{ bookingRef, serviceName: label, totalPence }}
          />
        </Card>
      </div>
    )
  }

  // Build checkout URL so /checkout knows this flow came from a reorder
  const checkoutHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('from', 'reorder'); // tells checkout the origin of the flow
    if (slug) params.set('slug', slug);
    params.set('option', String(safeIndex));
    params.set('qty', String(safeQty));
    return `/private-services/weight-loss/checkout?${params.toString()}`;
  }, [slug, safeIndex, safeQty]);


  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Re-order check</h1>

      {/* notice */}
      <Card>
        <p className="text-sm text-gray-700">
          Please note we have delays of up to 5 working days due to a recent surge of
          orders. We’ll ship as soon as possible. Only one pack per patient.
        </p>
        <div className="mt-3 flex justify-end">
          <Pill active={ack} onClick={() => setAck((v) => !v)}>
            I understand
          </Pill>
        </div>
      </Card>

      {/* BMI */}
      <Card hidden={!showBMI}>
        <Q>What is your current weight</Q>
        <p className="text-sm text-gray-500 mt-1">
          Patients need BMI over 20.5 kg/m² with one weight-related comorbidity
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-4 items-start">
          <div className="space-y-4">
            <p className="text-sm text-gray-700">Enter your height</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-40 border rounded-md p-2"
                placeholder={metricH ? 'cm' : 'inches'}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
              <Toggle label="Metric" checked={metricH} onChange={setMetricH} />
            </div>

            <p className="text-sm text-gray-700">Enter your weight</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-40 border rounded-md p-2"
                placeholder={metricW ? 'kg' : 'lbs'}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <Toggle label="Metric" checked={metricW} onChange={setMetricW} />
            </div>
          </div>

          {(() => {
            const BMI_MIN = 20.5
            const h = parseFloat(height)
            const w = parseFloat(weight)
            let _bmi: number | null = null
            if (!isNaN(h) && !isNaN(w) && h > 0 && w > 0) {
              const hM = metricH ? h / 100 : h * 0.0254
              const wKg = metricW ? w : w * 0.453592
              _bmi = wKg / (hM * hM)
            }
            const haveInputs = _bmi !== null
            const bmiValid = _bmi !== null && _bmi >= BMI_MIN

            return (
              <div className="flex flex-col items-end w-full">
                <p className="text-sm mt-4">
                  <span className="font-semibold">Your BMI is</span>{' '}
                  {_bmi !== null ? (Math.round(_bmi * 10) / 10).toFixed(1) : '--'}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    !haveInputs
                      ? 'text-gray-500'
                      : bmiValid
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                >
                  {!haveInputs
                    ? 'Enter height and weight to calculate BMI'
                    : bmiValid
                    ? 'Eligible to proceed'
                    : `Minimum BMI to proceed is ${BMI_MIN}. Contact us for advice.`}
                </p>
              </div>
            )
          })()}
        </div>
      </Card>

      {/* images */}
      <Card hidden={!showImages}>
        <Q>Upload a photo of your weight on scales with today’s date you can add more than one</Q>
        <p className="text-sm text-gray-600 mt-2">
          Due to updated regulations we need an email copy every three months.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <span>Add images</span>
          </label>
          {!haveImages && (
            <span className="text-xs text-red-600">At least one image is required</span>
          )}
        </div>

        {haveImages && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((im, i) => (
              <div key={i} className="relative">
                <img
                  src={im.url}
                  alt=""
                  className="w-full h-32 object-cover rounded-md border"
                />
                <button
                  type="button"
                  onClick={() => removeImg(i)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/70 text-white text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* tolerated */}
      <Card hidden={!showTolerated}>
        <Q>Have you tolerated your current dose well</Q>
        <RightBtns>
          <Pill active={tolerated === true} onClick={() => setTolerated(true)}>
            Yes
          </Pill>
          <Pill active={tolerated === false} onClick={() => setTolerated(false)}>
            No
          </Pill>
        </RightBtns>
        {tolerated === false && (
          <textarea
            rows={3}
            placeholder="Please list any intolerances"
            value={toleratedNotes}
            onChange={(e) => setToleratedNotes(e.target.value)}
            className="mt-3 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
          />
        )}
      </Card>

      {/* side effects */}
      <Card hidden={!showSides}>
        <Q>Have you experienced any side effects</Q>
        <RightBtns>
          <Pill active={hadSides === true} onClick={() => setHadSides(true)}>
            Yes
          </Pill>
          <Pill active={hadSides === false} onClick={() => setHadSides(false)}>
            No
          </Pill>
        </RightBtns>
        {hadSides === true && (
          <textarea
            rows={3}
            placeholder="Please list any side effects"
            value={sideNotes}
            onChange={(e) => setSideNotes(e.target.value)}
            className="mt-3 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
          />
        )}
      </Card>

      {/* GP */}
      <Card hidden={!showGP}>
        <p className="font-semibold text-gray-800">
          We need to let your GP know about your treatment.
        </p>
        <br />
        <p className="font-semibold text-gray-800">Please provide your GP details.</p>

        <div className="grid gap-4 md:grid-cols-[1fr,360px] mt-4 items-start">
          <GpPicker
            initial={{
              nameAddress: form.gp_name_address,
              name: form.gp_name,
              address: form.gp_address,
              id: form.gp_ods_code,
            }}
            onPick={(gp) => {
              const line = `${gp.name}${gp.address ? ' – ' + gp.address : ''}`
              setV({
                gp_selected: true,
                gp_name: gp.name,
                gp_address: gp.address,
                gp_name_address: line,
                gp_ods_code: gp.id,
              })
            }}
          />

          <div>
            <p className="text-sm text-gray-700">Please provide GP email preferred</p>
            <input
              type="email"
              className="mt-2 w-full border rounded-md p-2"
              placeholder="name@practice.nhs.uk"
              value={form.gp_email || ''}
              onChange={(e) => setV({ gp_email: e.target.value })}
            />
            <button
              type="button"
              onClick={() => {
                setV({ gp_email_submitted: true, gp_selected: true })
                // gently scroll to payment box if it appears
                requestAnimationFrame(() => {
                  const el = document.getElementById('reorder-pay')
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                })
              }}
              disabled={
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((form.gp_email || '').trim())
              }
              className="mt-2 w-full md:w-auto px-4 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              Submit Email
            </button>
            {form.gp_email_submitted && (
              <p className="mt-2 text-xs text-emerald-700">Email saved.</p>
            )}
          </div>
        </div>
      </Card>

      {/* payment box */}
      <Card id="reorder-pay" hidden={!ok}>
        <GoToCheckoutButton href={checkoutHref} />
      </Card>
    </div>
  )
}

/* ui helpers */
function Card({ id, hidden, children }: { id?: string; hidden?: boolean; children: React.ReactNode }) {
  return (
    <div id={id} className={[
      'bg-white rounded-xl border border-gray-200 p-5 mb-5',
      hidden ? 'hidden' : ''
    ].join(' ')}>
      {children}
    </div>
  )
}
function Q({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-gray-800">{children}</p>
}
function RightBtns({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex items-center gap-3 md:justify-end">{children}</div>
}
function Pill({
  active,
  onClick,
  disabled,
  children,
}: {
  active?: boolean
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-6 py-2 rounded-full border text-sm transition',
        disabled ? 'opacity-60 cursor-not-allowed' : '',
        active
          ? 'bg-emerald-600 border-emerald-600 text-white'
          : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <span>{label}</span>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={() => onChange(!checked)}
        />
        <span className="block w-12 h-6 rounded-full border border-gray-300 bg-gray-200 transition-colors peer-checked:bg-emerald-600 peer-checked:border-emerald-600" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6" />
      </span>
    </label>
  )
}

import { useRouter } from 'next/navigation'

function GoToCheckoutButton({ href }: { href: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      className="w-full px-4 py-3 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
      onClick={() => router.push(href)}
    >
      Go to checkout
    </button>
  )
}