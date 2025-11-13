/* global window */

// Optional global helper (same pattern as AboutYou)
declare global {
  interface Window {
    peUploadIntakeImage?: (file: File, kind: 'scale' | 'body') => Promise<{ ok?: boolean; url?: string; path?: string; message?: string } | null>;
  }
}

'use client'

import { useState, useEffect } from 'react'
import type { WeightAssessment } from '@/forms/weightLossSchema'

const CONDITIONS = [
  'Cholecystitis or chronic malabsorption syndrome',
  'Thyroid disease or thyroid cancer or family history of thyroid cancer or MEN2',
  'Inflammatory bowel disease such as ulcerative colitis, crohns disease',
  'Gastroparesis',
  'Type 1 or 2 Diabetes',
  'Gallbladder, gallstones or bile problems',
  'Pancreatitis',
  'Electrolyte imbalance',
  'Retinopathy',
]

const MEDS = [
  'Anticoagulants to thin the blood such as; Warfarin, Rivaroxaban',
  'Amiodarone',
  'Vitamin A, D, E or K supplements',
  'Ciclosporin',
  'Anti-retroviral medications such as tenofovir, efavirenz, abacavir or emtricitabine',
  'Acarbose',
  'Epilepsy Medication',
  'Diabetes or polycystic ovaries medication or insulin',
]

type Props = {
  value: WeightAssessment
  onChange: (next: WeightAssessment) => void
  onComplete?: () => void
  onBack?: () => void
  onMeta?: (m: { current?: number; total?: number; label?: string }) => void
}

export default function ConditionsMedicines({ value, onChange, onComplete, onBack }: Props) {
  const [q, setQ] = useState(0)
  const advanceTo = (n: number) => setQ((i) => (i >= n ? i : n))

  // Derive current step from saved answers (so a refresh shows the right sections)
  useEffect(() => {
    try {
      let next = 0;

      // 10. Weight-related conditions (Done button sets q10_done, but also progress if selections exist)
      const hasQ10 = Array.isArray((value as any).weight_related_conditions) && (value as any).weight_related_conditions.length > 0;
      if ((value as any).q10_done === true || hasQ10) next = Math.max(next, 1);

      // 11. Smoke (+ 11b)
      if (typeof (value as any).smoke === 'boolean') {
        if ((value as any).smoke === false) {
          next = Math.max(next, 2);
        } else if (typeof (value as any).want_stop_smoking_info === 'boolean') {
          next = Math.max(next, 2);
        }
      }

      // 12. Alcohol (+ 12b)
      if (typeof (value as any).drink_alcohol === 'boolean') {
        if ((value as any).drink_alcohol === false) {
          next = Math.max(next, 3);
        } else if (typeof (value as any).want_alcohol_info === 'boolean') {
          next = Math.max(next, 3);
        }
      }

      // 13. Prior WL / LED (+ details)
      if (typeof (value as any).prior_weightloss_or_led === 'boolean') {
        if ((value as any).prior_weightloss_or_led === false) {
          next = Math.max(next, 4);
        } else {
          const t = (((value as any).prior_weightloss_details || '') + '').trim();
          if (t.length > 0) next = Math.max(next, 4);
        }
      }

      // 14. Evidence (Yes → need attachment, No → advance)
      if (typeof (value as any).require_evidence_yes === 'boolean') {
        if ((value as any).require_evidence_yes === false) {
          next = Math.max(next, 5);
        } else {
          const attached = (value as any).evidence_image_attached || ((value as any).evidence_image_name && (value as any).evidence_image_size);
          if (attached) next = Math.max(next, 5);
        }
      }

      // 15. Eating disorder (+ details)
      if (typeof (value as any).eating_disorder === 'boolean') {
        if ((value as any).eating_disorder === false) {
          next = Math.max(next, 6);
        } else {
          const t = (((value as any).eating_disorder_text || '') + '').trim();
          if (t.length > 0) next = Math.max(next, 6);
        }
      }

      // 16. Conditions (YN + list + details)
      if (typeof (value as any).has_conditions_yes === 'boolean') {
        if ((value as any).has_conditions_yes === false) {
          next = Math.max(next, 7);
        } else {
          const listOk = Array.isArray((value as any).has_conditions) && (value as any).has_conditions.length > 0;
          const txtOk = (((value as any).conditions_text || '') + '').trim().length > 0;
          if (listOk && txtOk) next = Math.max(next, 7);
        }
      }

      // 17. Medicines (YN + list + details)
      if (typeof (value as any).has_medicines_yes === 'boolean') {
        if ((value as any).has_medicines_yes === false) {
          next = Math.max(next, 8);
        } else {
          const listOk = Array.isArray((value as any).has_medicines_list) && (value as any).has_medicines_list.length > 0;
          const txtOk = (((value as any).meds_text || '') + '').trim().length > 0;
          if (listOk && txtOk) next = Math.max(next, 8);
        }
      }

      // 18. Oral contraceptives (+ details)
      if (typeof (value as any).oral_contraceptives === 'boolean') {
        if ((value as any).oral_contraceptives === false) {
          next = Math.max(next, 9);
        } else {
          const t = (((value as any).ocp_details || '') + '').trim();
          if (t.length > 0) next = Math.max(next, 9);
        }
      }

      // 19. Exercise (+ details)
      if (typeof (value as any).exercise_4_5_per_week === 'boolean') {
        if ((value as any).exercise_4_5_per_week === false) {
          next = Math.max(next, 10);
        } else {
          const t = (((value as any).exercise_text || '') + '').trim();
          if (t.length > 0) next = Math.max(next, 10);
        }
      }

      // 20. Daily calories (select)
      if ((value as any).daily_calories) {
        // This is the last question in this step; we keep q at 10 so the section remains visible
        next = Math.max(next, 10);
      }

      setQ((i) => (i >= next ? i : next));
    } catch {}
  }, [value]);

  // Hydrate this step from sessionStorage on first mount (so refresh keeps Yes/No and uploads flags)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pe_weight_conditions')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved && typeof saved === 'object') {
        onChange({ ...(value as any), ...saved } as any)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave this step whenever answers change
  useEffect(() => {
    try {
      const id = setTimeout(() => {
        sessionStorage.setItem('pe_weight_conditions', JSON.stringify(value ?? {}))
      }, 150)
      return () => clearTimeout(id)
    } catch {}
  }, [value])

  // Reconcile with sessionStorage if parent prop is stale after refresh/navigation
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pe_weight_conditions')
      if (!raw) return
      const saved = JSON.parse(raw) || {}
      const needFix = (
        saved.require_evidence_yes !== undefined && saved.require_evidence_yes !== (value as any).require_evidence_yes
      ) || (
        !!saved.evidence_image_attached && !(value as any).evidence_image_attached
      ) || (
        saved.smoke !== undefined && saved.smoke !== (value as any).smoke
      ) || (
        saved.drink_alcohol !== undefined && saved.drink_alcohol !== (value as any).drink_alcohol
      ) || (
        saved.prior_weightloss_or_led !== undefined && saved.prior_weightloss_or_led !== (value as any).prior_weightloss_or_led
      )

      if (needFix) {
        onChange({ ...(value as any), ...saved } as any)
      }
    } catch {}
  }, [value])
  const setV = (patch: Partial<WeightAssessment> | Record<string, any>) => {
    const next: any = { ...(value as any), ...(patch as any) }
    onChange(next)
    try {
      sessionStorage.setItem('pe_weight_conditions', JSON.stringify(next))
    } catch {}
  }

  // local upload state for Q14 (evidence)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null)
  const [evidenceUploading, setEvidenceUploading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)

  // fetch with timeout to prevent hanging "Uploading..."
  async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 25000): Promise<Response> {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  // Try multiple endpoints so we behave like AboutYou uploads
  async function uploadEvidence(file: File): Promise<{ url?: string; path?: string } | null> {
    // 0) If host page provides a shared uploader, use it first (parity with AboutYou)
    try {
      if (typeof window !== 'undefined') {
        const fn = (window as any).peUploadIntakeImage as undefined | ((file: File, kind: 'scale' | 'body') => Promise<{ ok?: boolean; url?: string; path?: string; message?: string } | null>);
        if (typeof fn === 'function') {
          // Pass "evidence" as any to support hosts that accept a broader kind; keeps typings aligned with AboutYou
          const res = await (fn as any)(file, 'evidence' as any);
          if (res && (res.ok || res.url || res.path)) {
            return { url: res.url, path: res.path };
          }
        }
      }
    } catch { /* fall through to normal endpoints */ }

    // 1) Preferred dedicated endpoint (existing)
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('field', 'evidence_image');
      if ((value as any)?.intake_id) fd.append('intake_id', String((value as any).intake_id));
      if ((value as any)?.order_id) fd.append('order_id', String((value as any).order_id));

      const res = await fetchWithTimeout('/api/client-intake/upload', { method: 'POST', body: fd, cache: 'no-store' }, 25000);
      if (res.ok) {
        const data: any = await res.json().catch(() => ({}));
        const url = data?.url || data?.public_url || data?.file_url || data?.cdnUrl || data?.cdn_url || data?.full_url;
        const path = data?.path || data?.storage_path || data?.file_path || data?.key || data?.filepath;
        if (url || path) return { url, path };
      }
    } catch {/* fall through to fallbacks */}

    // 2) Fallbacks (mirror AboutYou behaviour)
    const fallbacks = ['/api/uploads/intake-image', '/api/uploads', '/api/assessment/upload'];
    for (const ep of fallbacks) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('kind', 'evidence');
        fd.append('context', 'weight-loss-assessment');

        const res = await fetchWithTimeout(ep, { method: 'POST', body: fd, cache: 'no-store' }, 25000);
        if (!res.ok) continue;
        const data: any = await res.json().catch(() => ({}));
        const url = data?.url || data?.publicUrl || data?.public_url || data?.cdnUrl || data?.cdn_url || data?.full_url;
        const path = data?.path || data?.key || data?.filepath || data?.storage_path || data?.file_path;
        if (url || path) return { url, path };
      } catch {/* try next */}
    }

    // 3) Explicit failure
    return null;
  }

  const handleEvidence = async (f: File | null) => {
    if (!f) return;
    setEvidenceError(null);

    // local preview immediately
    const localUrl = URL.createObjectURL(f);
    if (evidencePreview) URL.revokeObjectURL(evidencePreview);
    setEvidenceFile(f);
    setEvidencePreview(localUrl);

    // optimistic local state (let the user continue without waiting)
    setV({
      evidence_image_name: f.name,
      evidence_image_size: f.size,
      evidence_image_attached: true,
      evidence_image_mime: f.type || undefined,
      evidence_image_uploaded: false,
      evidence_image_upload_error: undefined,
    } as any);

    // advance immediately (don't block on network)
    setTimeout(() => advanceTo(5), 120);

    // upload to backend (with multiple fallbacks)
    try {
      setEvidenceUploading(true);
      const uploaded = await uploadEvidence(f);
      if (!uploaded) throw new Error('Upload failed or timed out');

      setV({
        evidence_image_url: uploaded.url || undefined,
        evidence_image_path: uploaded.path || undefined,
        evidence_image_uploaded: true,
        evidence_image_upload_error: undefined,
      } as any);
    } catch (err: any) {
      setV({
        evidence_image_uploaded: false,
        evidence_image_upload_error: err?.message || 'upload_failed',
      } as any);
      setEvidenceError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setEvidenceUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (evidencePreview) URL.revokeObjectURL(evidencePreview)
    }
  }, [evidencePreview])

  // helpers
  const yesNo = (b: boolean | undefined): '' | 'yes' | 'no' =>
    typeof b === 'boolean' ? (b ? 'yes' : 'no') : ''

  /* -------------------- RENDER -------------------- */

  return (
    <div className="space-y-6">
      {/* 10. Weight-related conditions (checkbox list) — KEEP Done */}
      <Card>
        <Q>
          Weight loss medication may be prescribed if your BMI is over 27 and you have a weight related medical
          condition. Please let us know if you have any of the following conditions:
        </Q>

        <div className="mt-3 grid gap-2 text-sm">
          {[
            'Acid reflux or gastro-oesophageal reflux disease',
            'High blood pressure',
            'Erectile Dysfunction',
            'Cardiovascular disease (e.g. heart attack or atrial fibrillation)',
            'High cholesterol',
            'Knee or hip osteoarthritis',
            'Asthma',
            'COPD',
            'Obstructive sleep apnoea',
            'Polycystic ovary syndrome (PCOS)',
            'Perimenopause/Menopause',
            'None of the above',
          ].map((label) => {
            const on = (value as any).weight_related_conditions?.includes(label)
            return (
              <label key={label} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-emerald-600"
                  checked={on}
                  onChange={() => {
                    const set = new Set((value as any).weight_related_conditions || [])
                    on ? set.delete(label) : set.add(label)
                    if (label === 'None of the above' && !on) {
                      set.clear()
                      set.add(label)
                    } else {
                      set.delete('None of the above')
                    }
                    setV({ weight_related_conditions: Array.from(set) })
                  }}
                />
                <span>{label}</span>
              </label>
            )
          })}
        </div>

        <div className="mt-3 flex justify-end">
          <Done onClick={() => { setV({ q10_done: true } as any);advanceTo(1)}} />
        </div>
      </Card>

      {/* 11. Smoke — AUTO ADVANCE (no Done) */}
      <Reveal show={q >= 1}>
        <Card>
          <Row>
            <Q>Do you smoke?</Q>
            <Right>
              <Pill
                active={yesNo((value as any).smoke) === 'yes'}
                onClick={() => {
                  setV({ smoke: true } as any)
                  // need 11b
                }}
              >
                Yes
              </Pill>
              <Pill
                active={yesNo((value as any).smoke) === 'no'}
                onClick={() => {
                  setV({ smoke: false, want_stop_smoking_info: undefined } as any)
                  setTimeout(() => advanceTo(2), 120)
                }}
              >
                No
              </Pill>
            </Right>
          </Row>

          {(value as any).smoke === true && (
            <Row className="mt-3">
              <p className="font-medium text-gray-800">Would you like information on stopping smoking?</p>
              <Right>
                <Pill
                  active={yesNo((value as any).want_stop_smoking_info) === 'yes'}
                  onClick={() => {
                    setV({ want_stop_smoking_info: true } as any)
                    setTimeout(() => advanceTo(2), 120)
                  }}
                >
                  Yes
                </Pill>
                <Pill
                  active={yesNo((value as any).want_stop_smoking_info) === 'no'}
                  onClick={() => {
                    setV({ want_stop_smoking_info: false } as any)
                    setTimeout(() => advanceTo(2), 120)
                  }}
                >
                  No
                </Pill>
              </Right>
            </Row>
          )}
        </Card>
      </Reveal>

      {/* 12. Alcohol — AUTO ADVANCE */}
      <Reveal show={q >= 2}>
        <Card>
          <Row>
            <Q>Do you drink alcohol?</Q>
            <Right>
              <Pill
                active={yesNo((value as any).drink_alcohol) === 'yes'}
                onClick={() => setV({ drink_alcohol: true } as any)}
              >
                Yes
              </Pill>
              <Pill
                active={yesNo((value as any).drink_alcohol) === 'no'}
                onClick={() => {
                  setV({ drink_alcohol: false, want_alcohol_info: undefined } as any)
                  setTimeout(() => advanceTo(3), 120)
                }}
              >
                No
              </Pill>
            </Right>
          </Row>

          {(value as any).drink_alcohol === true && (
            <Row className="mt-3">
              <p className="font-medium text-gray-800">Would you like information on safe alcohol use?</p>
              <Right>
                <Pill
                  active={yesNo((value as any).want_alcohol_info) === 'yes'}
                  onClick={() => {
                    setV({ want_alcohol_info: true } as any)
                    setTimeout(() => advanceTo(3), 120)
                  }}
                >
                  Yes
                </Pill>
                <Pill
                  active={yesNo((value as any).want_alcohol_info) === 'no'}
                  onClick={() => {
                    setV({ want_alcohol_info: false } as any)
                    setTimeout(() => advanceTo(3), 120)
                  }}
                >
                  No
                </Pill>
              </Right>
            </Row>
          )}
        </Card>
      </Reveal>

      {/* 13. Prior WL / LED — AUTO ADVANCE when done */}
      <Reveal show={q >= 3}>
        <Card>
          <Q>
            Have you ever been prescribed or currently taking weight loss medication or undergoing a low energy diet plan?
          </Q>
          <p className="text-sm text-gray-600 mt-2">
            You <span className="font-semibold">must</span> start on 0.25mg or 2.5mg and titrate up to reduce side effects. We may ask
            for evidence if you order a higher strength.
          </p>

          <Right className="mt-3">
            <Pill
              active={yesNo((value as any).prior_weightloss_or_led) === 'yes'}
              onClick={() => setV({ prior_weightloss_or_led: true } as any)}
            >
              Yes
            </Pill>
            <Pill
              active={yesNo((value as any).prior_weightloss_or_led) === 'no'}
              onClick={() => {
                setV({ prior_weightloss_or_led: false, prior_weightloss_details: '' } as any)
                setTimeout(() => advanceTo(4), 120)
              }}
            >
              No
            </Pill>
          </Right>

          {(value as any).prior_weightloss_or_led === true && (
            <>
              <p className="font-medium text-gray-800 mt-3">
                Tell us what medication/diet plan, whether current or past, why you stopped, and your starting weight.
              </p>
              <textarea
                rows={4}
                className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                value={(value as any).prior_weightloss_details || ''}
                onChange={(e) => setV({ prior_weightloss_details: e.target.value } as any)}
                onBlur={(e) => {
                  if ((e.target.value || '').trim()) setTimeout(() => advanceTo(4), 120)
                }}
              />
            </>
          )}
        </Card>
      </Reveal>

      {/* 14. Evidence — NOW YES/NO then upload (no Done) */}
      <Reveal show={q >= 4}>
        <Card>
          <Q>Do you need to upload evidence for higher strengths ordered elsewhere?</Q>
          <p className="text-sm text-gray-600 mt-2">
            Examples: label photo, prior prescription, letter/screenshot showing your name, medicine, strength, date and provider.
          </p>

          <Right className="mt-3">
            <Pill
              active={(value as any).require_evidence_yes === true}
              onClick={() => setV({ require_evidence_yes: true } as any)}
            >
              Yes
            </Pill>
            <Pill
              active={(value as any).require_evidence_yes === false}
              onClick={() => {
                setV({
                  require_evidence_yes: false,
                  evidence_image_name: undefined,
                  evidence_image_size: undefined,
                  evidence_image_attached: false,
                } as any)
                setEvidenceFile(null)
                if (evidencePreview) {
                  URL.revokeObjectURL(evidencePreview)
                  setEvidencePreview(null)
                }
                setTimeout(() => advanceTo(5), 120)
              }}
            >
              No
            </Pill>
          </Right>

          {(value as any).require_evidence_yes === true && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <UploadButton onFile={handleEvidence} disabled={evidenceUploading} />
              <div className="flex-1" />
              {(evidenceUploading) ? (
                <div className="text-sm text-gray-600">Uploading…</div>
              ) : (evidencePreview || (value as any).evidence_image_attached) ? (
                <Preview ok name={evidenceFile?.name || (value as any).evidence_image_name || 'Uploaded evidence'} />
              ) : null}
            </div>
          )}
          {(value as any).require_evidence_yes === true && !evidenceUploading && (value as any).evidence_image_uploaded === false && (
            <div className="mt-2 flex items-center gap-3">
              <p className="text-xs text-rose-700">Upload failed. {evidenceError ? String(evidenceError) : ''}</p>
              {evidenceFile ? (
                <button
                  type="button"
                  className="px-3 py-1 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs"
                  onClick={() => handleEvidence(evidenceFile)}
                >
                  Retry upload
                </button>
              ) : null}
            </div>
          )}
          {(value as any).require_evidence_yes === true && (
            <>
              {typeof (value as any).evidence_image_uploaded === 'boolean' && (
                <p className="text-xs text-gray-600 mt-1">
                  {(value as any).evidence_image_uploaded ? 'Saved to server' : 'Waiting to save or retrying…'}
                </p>
              )}
            </>
          )}
          {evidenceError && (
            <p className="mt-2 text-sm text-rose-700">{evidenceError}</p>
          )}
        </Card>
      </Reveal>

      {/* 15. Eating disorder — AUTO ADVANCE */}
      <Reveal show={q >= 5}>
        <Card>
          <Q>Do you have or have you ever suffered from an eating disorder (e.g. Bulimia or Anorexia)?</Q>
          <Right className="mt-2">
            <Pill
              active={yesNo((value as any).eating_disorder) === 'yes'}
              onClick={() => setV({ eating_disorder: true } as any)}
            >
              Yes
            </Pill>
            <Pill
              active={yesNo((value as any).eating_disorder) === 'no'}
              onClick={() => {
                setV({ eating_disorder: false, eating_disorder_text: '' } as any)
                setTimeout(() => advanceTo(6), 120)
              }}
            >
              No
            </Pill>
          </Right>

          {(value as any).eating_disorder === true && (
            <>
              <p className="font-medium text-gray-800 mt-3">Please provide more details.</p>
              <textarea
                rows={3}
                className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                value={(value as any).eating_disorder_text || ''}
                onChange={(e) => setV({ eating_disorder_text: e.target.value } as any)}
                onBlur={(e) => {
                  if ((e.target.value || '').trim()) setTimeout(() => advanceTo(6), 120)
                }}
              />
            </>
          )}
        </Card>
      </Reveal>

      {/* 16. Conditions — KEEP Done */}
      <Reveal show={q >= 6}>
        <Card>
          <Row>
            <Q>Do you have any of the following conditions?</Q>
            <Right>
              <Pill
                active={(value as any).has_conditions_yes === true}
                onClick={() => setV({ has_conditions_yes: true } as any)}
              >
                Yes
              </Pill>
              <Pill
                active={(value as any).has_conditions_yes === false}
                onClick={() =>
                  setV({
                    has_conditions_yes: false,
                    has_conditions: [],
                    conditions_text: '',
                  } as any)
                }
              >
                No
              </Pill>
            </Right>
          </Row>

          <div className="mt-3 grid gap-2 text-sm">
            {CONDITIONS.map((label) => {
              const selected = (value as any).has_conditions?.includes(label)
              const canSelect = (value as any).has_conditions_yes === true
              return (
                <label key={label} className={`flex items-center gap-2 ${canSelect ? '' : 'opacity-60'}`}>
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={!!selected}
                    disabled={!canSelect}
                    onChange={() => {
                      if (!canSelect) return
                      const set = new Set((value as any).has_conditions || [])
                      selected ? set.delete(label) : set.add(label)
                      setV({ has_conditions: Array.from(set) } as any)
                    }}
                  />
                  <span>{label}</span>
                </label>
              )
            })}
          </div>

          {Array.isArray((value as any).has_conditions) &&
            (value as any).has_conditions.length > 0 && (
              <>
                <p className="font-medium text-gray-800 mt-3">16b. Please provide more details</p>
                <textarea
                  rows={3}
                  className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                  value={(value as any).conditions_text || ''}
                  onChange={(e) => setV({ conditions_text: e.target.value } as any)}
                />
              </>
            )}

          <div className="mt-3 flex justify-end">
            <Done
              onClick={() => advanceTo(7)}
              disabled={
                typeof (value as any).has_conditions_yes !== 'boolean' ||
                ((value as any).has_conditions_yes === true &&
                  (!Array.isArray((value as any).has_conditions) ||
                    (value as any).has_conditions.length === 0 ||
                    !((value as any).conditions_text || '').trim()))
              }
            />
          </div>
        </Card>
      </Reveal>

      {/* 17. Medicines — KEEP Done */}
      <Reveal show={q >= 7}>
        <Card>
          <Row>
            <Q>Do you take any of the following medication?</Q>
            <Right>
              <Pill
                active={(value as any).has_medicines_yes === true}
                onClick={() => setV({ has_medicines_yes: true } as any)}
              >
                Yes
              </Pill>
              <Pill
                active={(value as any).has_medicines_yes === false}
                onClick={() =>
                  setV({
                    has_medicines_yes: false,
                    has_medicines_list: [],
                    meds_text: '',
                  } as any)
                }
              >
                No
              </Pill>
            </Right>
          </Row>

          <div className="mt-3 grid gap-2 text-sm">
            {MEDS.map((label) => {
              const selected = (value as any).has_medicines_list?.includes(label)
              const canSelect = (value as any).has_medicines_yes === true
              return (
                <label key={label} className={`flex items-center gap-2 ${canSelect ? '' : 'opacity-60'}`}>
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={!!selected}
                    disabled={!canSelect}
                    onChange={() => {
                      if (!canSelect) return
                      const set = new Set((value as any).has_medicines_list || [])
                      selected ? set.delete(label) : set.add(label)
                      setV({ has_medicines_list: Array.from(set) } as any)
                    }}
                  />
                  <span>{label}</span>
                </label>
              )
            })}
          </div>

          {Array.isArray((value as any).has_medicines_list) &&
            (value as any).has_medicines_list.length > 0 && (
              <>
                <p className="font-medium text-gray-800 mt-3">17b. Please let us know what medication you take</p>
                <textarea
                  rows={3}
                  className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                  value={(value as any).meds_text || ''}
                  onChange={(e) => setV({ meds_text: e.target.value } as any)}
                />
              </>
            )}

          <div className="mt-3 flex justify-end">
            <Done
              onClick={() => advanceTo(8)}
              disabled={
                typeof (value as any).has_medicines_yes !== 'boolean' ||
                ((value as any).has_medicines_yes === true &&
                  (!Array.isArray((value as any).has_medicines_list) ||
                    (value as any).has_medicines_list.length === 0 ||
                    !((value as any).meds_text || '').trim()))
              }
            />
          </div>
        </Card>
      </Reveal>

      {/* 18. Oral contraceptives — AUTO ADVANCE */}
      <Reveal show={q >= 8}>
        <Card>
          <Q>Do you take oral contraceptives?</Q>

          <Right className="mt-2">
            <Pill
              active={yesNo((value as any).oral_contraceptives) === 'yes'}
              onClick={() => setV({ oral_contraceptives: true } as any)}
            >
              Yes
            </Pill>
            <Pill
              active={yesNo((value as any).oral_contraceptives) === 'no'}
              onClick={() => {
                setV({ oral_contraceptives: false, ocp_details: '' } as any)
                setTimeout(() => advanceTo(9), 120)
              }}
            >
              No
            </Pill>
          </Right>

          {(value as any).oral_contraceptives === true && (
            <>
              <p className="text-sm font-semibold text-red-600 mt-2">
                Use barrier contraception for 4 weeks when starting Mounjaro and 4 weeks after a dose increase.
              </p>
              <p className="font-medium text-gray-800 mt-3">18b. Please provide more details:</p>
              <textarea
                rows={3}
                className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                value={(value as any).ocp_details || ''}
                onChange={(e) => setV({ ocp_details: e.target.value } as any)}
                onBlur={(e) => {
                  if ((e.target.value || '').trim()) setTimeout(() => advanceTo(9), 120)
                }}
              />
            </>
          )}
        </Card>
      </Reveal>

      {/* 19. Exercise — AUTO ADVANCE */}
      <Reveal show={q >= 9}>
        <Card>
          <Q>Do you exercise 4–5 times a week for 30 minutes?</Q>
          <p className="text-sm text-gray-600 mt-1">Exercising could include walking, running, cycling, swimming.</p>

          <Right className="mt-2">
            <Pill
              active={yesNo((value as any).exercise_4_5_per_week) === 'yes'}
              onClick={() => setV({ exercise_4_5_per_week: true } as any)}
            >
              Yes
            </Pill>
            <Pill
              active={yesNo((value as any).exercise_4_5_per_week) === 'no'}
              onClick={() => {
                setV({ exercise_4_5_per_week: false, exercise_text: '' } as any)
                setTimeout(() => advanceTo(10), 120)
              }}
            >
              No
            </Pill>
          </Right>

          {(value as any).exercise_4_5_per_week === true && (
            <>
              <p className="font-medium text-gray-800 mt-3">19b. Please provide more details:</p>
              <textarea
                rows={3}
                className="mt-2 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                value={(value as any).exercise_text || ''}
                onChange={(e) => setV({ exercise_text: e.target.value } as any)}
                onBlur={(e) => {
                  if ((e.target.value || '').trim()) setTimeout(() => advanceTo(10), 120)
                }}
              />
            </>
          )}
        </Card>
      </Reveal>

      {/* 20. Daily calories — AUTO COMPLETE on pick */}
      <Reveal show={q >= 10}>
        <Card>
          <Q>How many calories do you believe you consume daily?</Q>
          <p className="text-sm text-gray-600 mt-2">
            Weight loss treatments are only effective with a low-calorie diet and exercise plan.
          </p>

          <div className="mt-3 space-y-2 text-sm">
            {[
              { id: 'under1500', label: 'Less than 1500 a day' },
              { id: '1500to2500', label: '1500–2500 a day' },
              { id: 'over2500', label: 'More than 2500 a day' },
            ].map((o) => (
              <label key={o.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="daily_calories"
                  className="accent-emerald-600"
                  checked={(value as any).daily_calories === o.id}
                  onChange={() => {
                    setV({ daily_calories: o.id } as any)
                    setTimeout(() => onComplete?.(), 120)
                  }}
                />
                <span>{o.label}</span>
              </label>
            ))}
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

          {isConditionsComplete(value) && (
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

/* ---------- UI helpers (match About You) ---------- */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white-50 p-6 ">{children}</div>
}
function Q({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-gray-800">{children}</p>
}
function Row({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${className}`}>{children}</div>
}
function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div className={`transition-all duration-200 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none hidden'}`}>
      {children}
    </div>
  )
}
function Right({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex gap-3 md:justify-end items-center ${className}`}>{children}</div>
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
function Done({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
    >
      Done
    </button>
  )
}
function UploadButton({ onFile, disabled }: { onFile: (f: File | null) => void; disabled?: boolean }) {
  return (
    <label className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border border-emerald-600 ${disabled ? 'text-gray-400 cursor-not-allowed opacity-60' : 'text-emerald-700 hover:bg-emerald-50 cursor-pointer'}`}>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => onFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
        disabled={!!disabled}
      />
      <span>{disabled ? 'Uploading…' : 'Upload file'}</span>
    </label>
  )
}
function Preview({ ok, name }: { ok?: boolean; name: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-gray-300'}`} />
      <span className="truncate max-w-[260px]">{name}</span>
    </div>
  )
}

/* ---------- validation summary ---------- */

function isConditionsComplete(v: any): boolean {
  // 11/11b
  const smokeOK =
    typeof v.smoke === 'boolean' &&
    (v.smoke === false || typeof v.want_stop_smoking_info === 'boolean')

  // 12/12b
  const alcoholOK =
    typeof v.drink_alcohol === 'boolean' &&
    (v.drink_alcohol === false || typeof v.want_alcohol_info === 'boolean')

  // 13/13b
  const priorOK =
    typeof v.prior_weightloss_or_led === 'boolean' &&
    (v.prior_weightloss_or_led === false || !!(v.prior_weightloss_details || '').trim())

  // 14 (only if said Yes, then require attachment)
  const evidenceOK =
    (v.require_evidence_yes === false) ||
    (v.require_evidence_yes === true &&
      (v.evidence_image_attached || (!!v.evidence_image_name && !!v.evidence_image_size)))

  // 15
  const eatingOK =
    typeof v.eating_disorder === 'boolean' &&
    (v.eating_disorder === false || !!(v.eating_disorder_text || '').trim())

  // 16
  const condYN = typeof v.has_conditions_yes === 'boolean'
  const condOK =
    v.has_conditions_yes === false ||
    (Array.isArray(v.has_conditions) && v.has_conditions.length > 0 && !!(v.conditions_text || '').trim())

  // 17
  const medsYN = typeof v.has_medicines_yes === 'boolean'
  const medsOK =
    v.has_medicines_yes === false ||
    (Array.isArray(v.has_medicines_list) && v.has_medicines_list.length > 0 && !!(v.meds_text || '').trim())

  // 18
  const ocpOK =
    typeof v.oral_contraceptives === 'boolean' &&
    (v.oral_contraceptives === false || !!(v.ocp_details || '').trim())

  // 19
  const exOK =
    typeof v.exercise_4_5_per_week === 'boolean' &&
    (v.exercise_4_5_per_week === false || !!(v.exercise_text || '').trim())

  // 20
  const kcalOK = !!v.daily_calories

  return (
    smokeOK &&
    alcoholOK &&
    priorOK &&
    evidenceOK &&
    eatingOK &&
    condYN &&
    condOK &&
    medsYN &&
    medsOK &&
    ocpOK &&
    exOK &&
    kcalOK
  )
}
