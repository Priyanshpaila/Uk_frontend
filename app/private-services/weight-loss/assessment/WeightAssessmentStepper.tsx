'use client'

import { useEffect, useMemo, useState } from 'react'
import type { WeightAssessment } from '@/forms/weightLossSchema'
import AboutYou from './steps/AboutYou'
import ConditionsMedicines from './steps/ConditionsMedicines'
import PastHistory from './steps/PastHistory'
import Declarations from './steps/Declarations'

type Props = {
  value: WeightAssessment
  onChange: (next: WeightAssessment) => void
  onSubmit: () => void
  onProgress?: (index: number, total: number) => void
  onBack?: () => void
  hideTabs?: boolean
  hideNav?: boolean
  onSectionLabel?: (label: string) => void
}

/* global progress one point per card */
function computeAssessmentProgress(v: any): { answered: number; total: number } {
  let answered = 0
  let total = 0

  /* About you 8 cards */
  total += 1; if (v.about_ack === true) answered += 1
  total += 1; if (typeof v.age_18_to_85 === 'boolean') answered += 1
  total += 1; if (Array.isArray(v.ethnicity) && v.ethnicity.length > 0) answered += 1
  total += 1; {
    const ok =
      typeof v.pregnant_or_breastfeeding_or_planning === 'boolean' &&
      (v.pregnant_or_breastfeeding_or_planning === false ||
        String(v.preg_text || '').trim().length > 0)
    if (ok) answered += 1
  }
  total += 1; if (typeof v.bmi === 'number' && !Number.isNaN(v.bmi)) answered += 1
  total += 1; if (String(v.target_weight ?? '').trim()) answered += 1
  // count photo questions if attached OR already uploaded (survives refresh)
  const hasScale = !!(v.scale_image_attached || v.scale_image_uploaded || v.scale_image_url || v.scale_image_path)
  const hasBody  = !!(v.body_image_attached  || v.body_image_uploaded  || v.body_image_url  || v.body_image_path)
  total += 1; if (hasScale) answered += 1
  total += 1; if (hasBody)  answered += 1

  /* Conditions and medicines 11 cards q10 to q20 */
  total += 1; if (v.q10_done === true) answered += 1
  total += 1; {
    const ok =
      typeof v.smoke === 'boolean' &&
      (v.smoke === false || typeof v.want_stop_smoking_info === 'boolean')
    if (ok) answered += 1
  }
  total += 1; {
    const ok =
      typeof v.drink_alcohol === 'boolean' &&
      (v.drink_alcohol === false || typeof v.want_alcohol_info === 'boolean')
    if (ok) answered += 1
  }
  total += 1; {
    const ok =
      typeof v.prior_weightloss_or_led === 'boolean' &&
      (v.prior_weightloss_or_led === false ||
        String(v.prior_weightloss_details || '').trim().length > 0)
    if (ok) answered += 1
  }
  total += 1; {
    const ok =
      v.require_evidence_yes === false ||
      (v.require_evidence_yes === true &&
        (v.evidence_image_attached === true ||
          (!!v.evidence_image_name && !!v.evidence_image_size)))
    if (ok) answered += 1
  }
  total += 1; {
    const ok =
      typeof v.eating_disorder === 'boolean' &&
      (v.eating_disorder === false ||
        String(v.eating_disorder_text || '').trim().length > 0)
    if (ok) answered += 1
  }
  total += 1; {
    const ok =
      typeof v.has_conditions_yes === 'boolean' &&
      (v.has_conditions_yes === false ||
        (Array.isArray(v.has_conditions) &&
          v.has_conditions.length > 0 &&
          String(v.conditions_text || '').trim().length > 0))
    if (ok) answered += 1
  }
  total += 1; {
    const ok =
      typeof v.has_medicines_yes === 'boolean' &&
      (v.has_medicines_yes === false ||
        (Array.isArray(v.has_medicines_list) &&
          v.has_medicines_list.length > 0 &&
          String(v.meds_text || '').trim().length > 0))
    if (ok) answered += 1
  }
  total += 1; {
    const ok =
      typeof v.oral_contraceptives === 'boolean' &&
      (v.oral_contraceptives === false ||
        String(v.ocp_details || '').trim().length > 0)
    if (ok) answered += 1
  }
  total += 1; {
    const ok =
      typeof v.exercise_4_5_per_week === 'boolean' &&
      (v.exercise_4_5_per_week === false ||
        String(v.exercise_text || '').trim().length > 0)
    if (ok) answered += 1
  }
  total += 1; if (!!v.daily_calories) answered += 1

  /* Past medical history 4 cards */
  total += 1; if (typeof v.kidney_or_liver_impairment === 'boolean') answered += 1
  total += 1; if (typeof v.other_medical_conditions_yes === 'boolean') answered += 1
  total += 1; if (typeof v.current_or_recent_meds_yes === 'boolean') answered += 1
  total += 1; if (typeof v.allergies_yes === 'boolean') answered += 1

  /* GP details 1 card */
  total += 1; {
    const ok =
      v.gp_selected === true &&
      typeof v.gp_email === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.gp_email) &&
      v.gp_email_submitted === true
    if (ok) answered += 1
  }

  /* Declarations and consent 5 cards */
  total += 1; if (v.ack_needles_swabs_bin === true) answered += 1
  total += 1; if (v.ack_first_attempt_delivery === true) answered += 1
  total += 1; if (v.consent_scr_access === true) answered += 1
  total += 1; if (v.ack_treatment_rules === true) answered += 1
  total += 1; if (v.final_declaration === true) answered += 1

  const EXPECTED_TOTAL = 29
  return { answered: Math.min(answered, EXPECTED_TOTAL), total: EXPECTED_TOTAL }
}

function LinearProgress({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)))
  return (
    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
      <div
        className="h-full bg-emerald-600 transition-all"
        style={{ width: `${clamped}%` }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        role="progressbar"
      />
    </div>
  )
}

/* top progress pill like before */
function ProgressPill({ answered, total }: { answered: number; total: number }) {
  const pct = Math.round((answered / Math.max(1, total)) * 100)
  const left = Math.max(0, total - answered)
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3">
      <span className="rounded-full bg-emerald-50 text-emerald-800 text-sm font-medium px-3 py-1">
        {pct}% complete
      </span>
      <span className="text-sm text-gray-700">
        {answered} of {total} answered • {left} questions left
      </span>
      <div className="w-full md:flex-1 md:max-w-md md:ml-2 mt-2 md:mt-0">
        <LinearProgress pct={pct} />
      </div>
    </div>
  )
}

export default function WeightAssessmentStepper({
  value,
  onChange,
  onSubmit,
  onProgress,
  hideTabs = false,
  hideNav = false,
  onSectionLabel,
}: Props) {
  const [step, setStep] = useState(0)

  const steps = useMemo(
    () => [
      {
        id: 0,
        label: 'About you',
        render: () => (
          <AboutYou
            value={value}
            onChange={onChange}
            onComplete={() => setStep((s) => s + 1)}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
          />
        ),
      },
      {
        id: 1,
        label: 'Conditions & medicines',
        render: () => (
          <ConditionsMedicines
            value={value}
            onChange={onChange}
            onComplete={() => setStep((s) => s + 1)}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
          />
        ),
      },
      {
        id: 2,
        label: 'Past medical history',
        render: () => (
          <PastHistory
            value={value}
            onChange={onChange}
            onComplete={() => setStep((s) => s + 1)}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
          />
        ),
      },
      {
        id: 3,
        label: 'Declarations & consent',
        render: () => (
          <Declarations
            value={value}
            onChange={onChange}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            onSubmit={onSubmit}
          />
        ),
      },
    ],
    [value, onChange, onSubmit]
  )

  const stepCount = steps.length

  useEffect(() => {
    onProgress?.(step, stepCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    onSectionLabel?.(steps[step]?.label || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Navigation behaviour controlled by completion state computed below

  const { answered, total } = computeAssessmentProgress(value)

  const leftCount = Math.max(0, total - answered)
  const isCompleteAll = leftCount === 0

  return (
    <div className="p-0">
      <div className="mx-auto max-w-screen-lg rounded-xl overflow-hidden">
        <ProgressPill answered={answered} total={total} />

        {!hideTabs && (
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap px-4 py-3">
            {steps.map((s, i) => {
              const active = i === step
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(i)}
                  className={[
                    'shrink-0 rounded-full px-3 py-1.5 text-sm',
                    active
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 font-medium'
                      : 'text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        )}

        <main className="px-4 sm:px-6 py-6">
          <div className="mx-auto w-full max-w-[740px]">
            {steps.map((s, i) => (
              <section key={s.id} className={i === step ? 'block' : 'hidden'} aria-hidden={i !== step}>
                {s.render()}
              </section>
            ))}

            {!hideNav && (
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-none disabled:opacity-60"
                  disabled={step === 0}
                >
                  Back
                </button>

                {isCompleteAll ? (
                  <button
                    type="button"
                    onClick={onSubmit}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none"
                  >
                    Submit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none"
                  >
                    Next
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
