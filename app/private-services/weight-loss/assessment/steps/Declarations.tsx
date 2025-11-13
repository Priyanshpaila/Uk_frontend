'use client'

import { useState } from 'react'
import type { WeightAssessment } from '@/forms/weightLossSchema'
import { useRouter } from 'next/navigation'

type Props = {
  value: WeightAssessment
  onChange: (next: WeightAssessment) => void
  onBack?: () => void
  onSubmit?: () => void
  onMeta?: (m: { current?: number; total?: number; label?: string }) => void
}

export default function Declarations({ value, onChange, onBack, onSubmit }: Props) {
  const [touched29, setTouched29] = useState(false)
  const [touched30, setTouched30] = useState(false)
  const router = useRouter()
  const kind = (() => {
    const t = String((value as any)?.type || '').toLowerCase()
    return t === 'transfer' ? 'transfer' : 'new'
  })()

  const setV = (k: keyof WeightAssessment, v: any) =>
    onChange({ ...(value as any), [k]: v })

  function set<T>(obj: T, key: keyof T, val: any): T {
  return { ...(obj as any), [key]: val }
  }
  // Progressive reveal gates
  const show27 = value.ack_needles_swabs_bin === true
  const show28 = show27 && value.ack_first_attempt_delivery === true
  const show29 = show28 && value.consent_scr_access === true
  const show30 = show29 && value.ack_treatment_rules === true

  return (
    <div className="space-y-8">
      <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Declarations & Consent</h3>

      {/* 26 – Mounjaro consumables */}
      <Card>
        <p className="font-medium text-gray-800 leading-6">
          FAO Mounjaro patients only: I understand that I will need needles, swabs and a sharps bin to use Mounjaro.
        </p>
        <ul className="text-sm leading-6 mt-2 list-disc pl-5 text-gray-700">
          <li>
            These can be purchased here:{' '}
            <a className="underline text-emerald-700" href="https://www.pharmacy-express.co.uk/" target="_blank" rel="noreferrer">
              Needles, Swabs, Sharps bin
            </a>
          </li>
          <li>All other patients please click “Yes” to continue.</li>
        </ul>
        <div className="mt-3">
          <Pill
            active={value.ack_needles_swabs_bin === true}
            onClick={() => setV('ack_needles_swabs_bin', true)}
          >
            I understand
          </Pill>
        </div>
      </Card>

      {/* 27 – First delivery attempt */}
      {show27 && (
        <Card>
          <p className="font-medium text-gray-800 leading-6">
            IMPORTANT: I understand that the delivery must be accepted on the first delivery attempt. This is a
            temperature-controlled item with ice packs and a temperature-controlled pouch; missed orders cannot be
            returned or refunded.
          </p>
          <div className="mt-3">
            <Pill
              active={value.ack_first_attempt_delivery === true}
              onClick={() => setV('ack_first_attempt_delivery', true)}
            >
              I understand
            </Pill>
          </div>
        </Card>
      )}

      {/* 28 – SCR consent */}
      {show28 && (
        <Card>
          <p className="font-medium text-gray-800 leading-6">
            We need consent to access your NHS Summary Care Records. Please provide us consent.
          </p>
          <div className="mt-3">
            <Pill
              active={value.consent_scr_access === true}
              onClick={() => setV('consent_scr_access', true)}
            >
              I consent
            </Pill>
          </div>
        </Card>
      )}

      {/* 29 – Treatment rules (Yes/No with message on No) */}
      {show29 && (
        <Card>
          <p className="font-medium text-gray-800 leading-6">I agree to the following:</p>
          <ul className="text-sm leading-6 mt-2 list-disc pl-5 text-gray-700 space-y-1">
            <li>Mounjaro and Wegovy is administered once a week whereas Saxenda is administered once daily at any time.</li>
            <li>Mounjaro, Wegovy and Saxenda are for subcutaneous use only. It must not be administered in any other way. It should be injected in the stomach area (abdomen), upper leg (thigh) or upper arm. I have watched the video on how to use and administer Mounjaro/Wegovy/Saxenda.</li>
            <li>I will not share my pen with anyone else as it may not be suitable for them and can cause infections.</li>
            <li>I will store my pens in a fridge (2°C to 8°C) to maintain the cold chain. The pen currently in use can be kept out of the fridge for up to one month under 30°C..</li>
            <li>I understand dehydration risk and will drink at least 2 litres of water a day.</li>
            <li>Treatment is for adults 18+ and must be combined with diet and exercise.</li>
            <li>I will stop treatment if I fail to lose 5% of body weight within 12 weeks of full dosing.</li>
            <li>I have read the patient information leaflets for Saxenda, Wegovy and Mounjaro.</li>
          </ul>

          <div className="mt-4 flex gap-3">
            <Pill
              active={value.ack_treatment_rules === true}
              onClick={() => {
                setTouched29(true)
                setV('ack_treatment_rules', true)
              }}
            >
              Yes
            </Pill>
            <Pill
              active={value.ack_treatment_rules === false && touched29}
              onClick={() => {
                setTouched29(true)
                setV('ack_treatment_rules', false)
              }}
            >
              No
            </Pill>
          </div>

          {touched29 && value.ack_treatment_rules === false && (
            <BlockMsg />
          )}
        </Card>
      )}

      {/* 30 – Final declaration (Yes/No with message on No) */}
      {show30 && (
        <Card>
          <p className="font-medium text-gray-800 leading-6">Do you agree with the following?</p>
          <ul className="text-sm leading-6 mt-2 list-disc pl-5 text-gray-700 space-y-1">
            <li>You have read the information available on the treatments and medication web page and understand the side effects, their effectiveness and alternatives available.</li>
            <li>You have answered the questions honestly and accurately and the treatment is solely for your personal use..</li>
            <li>You will read and understand the patient information leaflet supplied with your medication.</li>
            <li>You understand that it is mandatory to inform your GP of this treatment so they can provide safe healthcare.</li>
            <li>You understand prescribing decisions will be based on the answers from your consultation and incorrect information can cause harm to your health. Orders may be rejected if not clinically suitable. The prescribing decisions is always the clinicians..</li>
            <li>You are aware Pharmacy Express will undertake a soft check to validate your identity using LexisNexis. Note: This does not affect your credit rating..</li>
            <li>
              You have read and agree to our{' '}
              <a className="underline text-emerald-700" href="/terms" target="_blank">Terms &amp; Conditions</a>,{' '}
              <a className="underline text-emerald-700" href="/terms-of-use" target="_blank">Terms of Use</a> and{' '}
              <a className="underline text-emerald-700" href="/privacy" target="_blank">Privacy Policy</a>.
            </li>
          </ul>

          <div className="mt-4 flex gap-3">
            <Pill
              active={value.final_declaration === true}
              onClick={() => {
                setTouched30(true)
                setV('final_declaration', true)
              }}
            >
              Yes
            </Pill>
            <Pill
              active={value.final_declaration === false && touched30}
              onClick={() => {
                setTouched30(true)
                setV('final_declaration', false)
              }}
            >
              No
            </Pill>
          </div>

          {touched30 && value.final_declaration === false && (
            <BlockMsg />
          )}

          <p className="text-sm text-gray-600 mt-3 leading-6">
            <strong>Note:</strong> The Submit button is enabled only when you agree to the final declaration.
          </p>
        </Card>
      )}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onBack?.()}
          className="px-4 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
        >
          Back
        </button>

        <button
          type="button"
          onClick={() => {
            if (!value.final_declaration) return
            if (onSubmit) {
              onSubmit()
            } else {
              router.push(`/private-services/weight-loss/booking?type=${encodeURIComponent(kind)}`)
            }
          }}
          disabled={!value.final_declaration /* + any other gating you want */}
          className="px-6 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Submit
        </button>
      </div>  
    </div>
  )
}

/* --- UI bits --- */
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-lg p-5">{children}</div>
}

function Pill({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-6 py-2 rounded-full border text-sm ${
        active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function BlockMsg() {
  return (
    <div className="mt-4 border border-rose-300 bg-rose-50 text-rose-800 p-3 rounded-md text-sm leading-6">
      <strong>We cannot supply you with this treatment at this moment.</strong>{' '}
      Please contact our patient support team at{' '}
      <a className="underline" href="mailto:info@pharmacy-express.co.uk">info@pharmacy-express.co.uk</a>{' '}
      so we can discuss your options.
    </div>
  )
}
