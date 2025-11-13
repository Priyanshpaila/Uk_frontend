/* global window */
'use client'
// Global helper for intake image upload (optional, may be present on window)
declare global {
  interface Window {
    peUploadIntakeImage?: (file: File, kind: 'scale' | 'body') => Promise<{ ok?: boolean; url?: string; path?: string; message?: string } | null>;
  }
}
import { useEffect, useMemo, useRef, useState } from 'react'
// Helper to extract filename from URL/path
const baseName = (s?: string | null) => {
  if (!s) return undefined;
  try {
    const str = String(s);
    const fromUrl = str.split('?')[0].split('#')[0];
    const parts = fromUrl.split('/');
    const last = parts[parts.length - 1] || undefined;
    return last || undefined;
  } catch {
    return undefined;
  }
};
import type { WeightAssessment } from '@/forms/weightLossSchema'
import { useRouter, useSearchParams } from 'next/navigation'




type Props = {
  value: WeightAssessment
  onChange: (next: WeightAssessment) => void
  onComplete?: () => void
  onBack?: () => void
}

export default function AboutYou({ value, onChange, onComplete, onBack }: Props) {
  const showDebug = (() => {
    try {
      if (typeof window === 'undefined') return false;
      const p = new URLSearchParams(window.location.search);
      return p.get('debug') === '1';
    } catch {
      return false;
    }
  })();
  const setV = (patch: Partial<WeightAssessment> | Record<string, any>) =>
    onChange({ ...(value as any), ...(patch as any) })

  const STORAGE_KEY_SESSION = 'pe_weight_aboutyou';
  const STORAGE_KEY_LOCAL = 'pe_weight_aboutyou_local';

  // persist immediately to both sessionStorage and localStorage so refreshes & some iOS/Safari cases survive
  const persistNow = (patch?: Partial<WeightAssessment> | Record<string, any>) => {
    try {
      const next = { ...(value as any), ...(patch as any) } as any;
      if (typeof window !== 'undefined') {
        try { sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(next ?? {})); } catch {}
        try { localStorage.setItem(STORAGE_KEY_LOCAL, JSON.stringify(next ?? {})); } catch {}
      }
    } catch {}
  };

  const router = useRouter()
  const sp = useSearchParams()
  const type = (sp.get('type') || 'new').toLowerCase()
  const backToProducts = () => {
    try {
      // Let parent run any cleanup, but do not block navigation
      onBack?.()
    } catch {}
    const q = new URLSearchParams({ type: type || 'new' })
    router.push(`/private-services/weight-loss/treatments?${q.toString()}`)
  }

  // hydrate from sessionStorage once on mount
  useEffect(() => {
    try {
      const read = (k: string) => {
        try { const raw = (typeof window !== 'undefined') ? window[k as 'sessionStorage' | 'localStorage']?.getItem?.(k === STORAGE_KEY_SESSION ? STORAGE_KEY_SESSION : STORAGE_KEY_LOCAL) : null; return raw; } catch { return null; }
      };
      const rawSession = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_SESSION) : null;
      const rawLocal   = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LOCAL)   : null;
      const raw = rawSession || rawLocal;
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        const next: any = { ...(value as any) };
        for (const [k, v] of Object.entries(saved)) {
          // only fill when current is empty-ish
          if (next[k] === undefined || next[k] === null || next[k] === '' || next[k] === false) {
            next[k] = v as any;
          }
        }
        onChange(next as any);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // name from query only to avoid stale local names
  useEffect(() => {
    if (value?.name && value.name.trim()) return;
    try {
      const qp = new URLSearchParams(window.location.search);
      const picked = (qp.get('full_name') || qp.get('name') || '').trim();
      if (picked) {
        const cleaned = picked.replace(/\s+/g, ' ').slice(0, 80);
        setV({ name: cleaned });
      }
    } catch {}
  }, []);

  const firstName = useMemo(() => {
    const n = (value?.name || '').trim()
    return n ? n.split(/\s+/)[0] : 'there'
  }, [value?.name])

  // step index
  // 0 greeting
  // 1 age
  // 2 ethnicity
  // 3 pregnancy
  // 4 bmi
  // 5 target
  // 6 scale photo
  // 7 body photo
  const initialQ = useMemo(() => {
    // always start at greeting
    return 0
  }, [])

  const [q, setQ] = useState(initialQ)
  // autosave on change
  useEffect(() => {
    try {
      const id = setTimeout(() => {
        try { sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(value ?? {})); } catch {}
        try { localStorage.setItem(STORAGE_KEY_LOCAL, JSON.stringify(value ?? {})); } catch {}
      }, 150);
      return () => clearTimeout(id);
    } catch {}
  }, [value]);
  const advanceTo = (n: number) => setQ((i) => (i >= n ? i : n))

  // Derive current step from saved answers so refresh shows the right section automatically
  useEffect(() => {
    try {
      let next = 0;

      const hasScale = !!((value as any)?.scale_image_attached || (value as any)?.scale_image_url || (value as any)?.scale_image_path);
      const hasBody  = !!((value as any)?.body_image_attached  || (value as any)?.body_image_url  || (value as any)?.body_image_path);

      if ((value as any)?.about_ack === true) next = Math.max(next, 1);

      if (typeof (value as any)?.age_18_to_85 === 'boolean') next = Math.max(next, 2);

      if (Array.isArray((value as any)?.ethnicity) && ((value as any).ethnicity || []).length > 0) {
        next = Math.max(next, 3);
      }

      if (typeof (value as any)?.pregnant_or_breastfeeding_or_planning === 'boolean') {
        if ((value as any).pregnant_or_breastfeeding_or_planning === false) {
          next = Math.max(next, 4);
        } else {
          const t = (((value as any).preg_text || '') + '').trim();
          if (t.length > 0) next = Math.max(next, 4);
        }
      }

      const bmiVal = (value as any)?.bmi;
      if (typeof bmiVal === 'number' && Number.isFinite(bmiVal) && bmiVal >= 20.5) {
        next = Math.max(next, 5);
      }

      const target = (((value as any)?.target_weight || '') + '').trim();
      if (target) next = Math.max(next, 6);

      if (hasScale) next = Math.max(next, 7);
      if (hasBody)  next = Math.max(next, 8);

      // Only move forward, never backward
      setQ((i) => (i >= next ? i : next));
    } catch {}
  }, [value]);

  

  // pregnancy textarea auto advance
  const pregText = ((value as any)?.preg_text ?? '') as string
  useEffect(() => {
    if (value.pregnant_or_breastfeeding_or_planning === true) {
      const t = pregText.trim()
      if (t.length > 1) {
        const id = setTimeout(() => advanceTo(4), 350)
        return () => clearTimeout(id)
      }
    }
  }, [value.pregnant_or_breastfeeding_or_planning, pregText])

  // BMI inputs and auto advance
  const [metricH, setMetricH] = useState<boolean>(true)
  const [metricW, setMetricW] = useState<boolean>(true)
  const [height, setHeight] = useState<number | ''>('')
  const [weight, setWeight] = useState<number | ''>('')

  // hydrate height/weight + unit prefs from saved answers so a refresh keeps inputs
  useEffect(() => {
    try {
      const hv = (value as any)?.height_input;
      const wv = (value as any)?.weight_input;
      const hm = (value as any)?.height_metric;
      const wm = (value as any)?.weight_metric;

      if (typeof hm === 'boolean') setMetricH(hm);
      if (typeof wm === 'boolean') setMetricW(wm);

      if (height === '' && (hv ?? '') !== '') setHeight(hv as any);
      if (weight === '' && (wv ?? '') !== '') setWeight(wv as any);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // helper to round to 1 dp
  const r1 = (n: number) => Math.round(n * 10) / 10;

  // normalize + persist whenever inputs or unit change
  useEffect(() => {
    try {
      const hIn = height;
      const wIn = weight;

      const cm = hIn === '' ? undefined : (metricH ? Number(hIn) : Number(hIn) * 2.54);
      const kg = wIn === '' ? undefined : (metricW ? Number(wIn) : Number(wIn) * 0.45359237);

      const patch: any = {
        height_metric: metricH,
        weight_metric: metricW,
        height_input: hIn === '' ? '' : Number(hIn),
        weight_input: wIn === '' ? '' : Number(wIn),
      };
      if (typeof cm === 'number' && Number.isFinite(cm)) patch.height_cm = r1(cm);
      if (typeof kg === 'number' && Number.isFinite(kg)) patch.weight_kg = r1(kg);

      setV(patch);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, weight, metricH, metricW]);

  const bmi = computeBMI(height, weight, metricH, metricW)
  const totals = aboutYouTotals(value as any);
  // Prefer saved BMI from value when height/weight are not present (e.g., after refresh)
  const roundedCalcBmi = bmi !== null ? Math.round(bmi * 10) / 10 : null
  const savedBmi = typeof (value as any)?.bmi === 'number' ? Math.round((value as any).bmi * 10) / 10 : null
  const effectiveBmi = roundedCalcBmi !== null ? roundedCalcBmi : savedBmi
  useEffect(() => {
    if (roundedCalcBmi !== null && Number.isFinite(roundedCalcBmi)) {
      setV({ bmi: roundedCalcBmi } as any)
      if (roundedCalcBmi >= 20.5) {
        const id = setTimeout(() => advanceTo(5), 350)
        return () => clearTimeout(id)
      }
    }
  }, [roundedCalcBmi])

  // target weight auto advance
  const target = (((value as any)?.target_weight || '') as string).trim()
  useEffect(() => {
    if (q >= 5 && target) {
      const id = setTimeout(() => advanceTo(6), 300)
      return () => clearTimeout(id)
    }
  }, [q, target])

  // uploads with preview and cleanup and auto advance

  async function uploadIntakeImage(file: File, kind: 'scale' | 'body'): Promise<{ ok?: boolean; url?: string; path?: string } | null> {
    // Try a few likely API endpoints; if none exist, fail silently and keep local preview only.
    const endpoints = ['/api/uploads/intake-image', '/api/uploads', '/api/assessment/upload'];
    for (const ep of endpoints) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('kind', kind);
        fd.append('context', 'weight-loss-assessment');
        const res = await fetch(ep, { method: 'POST', body: fd, cache: 'no-store' });
        if (!res.ok) continue;
        const data: any = await res.json().catch(() => ({}));
        const url = data?.url || data?.publicUrl || data?.public_url || data?.cdnUrl || data?.cdn_url;
        const path = data?.path || data?.key || data?.filepath;
        if (url || path) return { ok: true, url, path };
      } catch {
        // try next endpoint
      }
    }
    return null;
  }
  const [scalePreview, setScalePreview] = useState<string | null>(null)
  const [bodyPreview, setBodyPreview] = useState<string | null>(null)
  const [scaleName, setScaleName] = useState<string>('');
  const [bodyName, setBodyName] = useState<string>('');

  const handleFile = async (f: File | null, kind: 'scale' | 'body') => {
    if (!f) return;

    // immediate local preview
    const localUrl = URL.createObjectURL(f);

    if (kind === 'scale') {
      if (scalePreview) URL.revokeObjectURL(scalePreview);
      setScalePreview(localUrl);
      setScaleName(f.name);
      setV({
        scale_image_name: f.name,
        scale_image_size: f.size,
        scale_image_attached: true,
        scale_image_mime: f.type || undefined,
        // mark upload pending
        scale_image_uploaded: false,
        scale_image_upload_error: undefined,
      } as any);
      persistNow({
        scale_image_name: f.name,
        scale_image_size: f.size,
        scale_image_attached: true,
        scale_image_mime: f.type || undefined,
        scale_image_uploaded: false,
        scale_image_upload_error: undefined,
      });
      // jump to next step when selected
      setTimeout(() => advanceTo(7), 200);
    } else {
      if (bodyPreview) URL.revokeObjectURL(bodyPreview);
      setBodyPreview(localUrl);
      setBodyName(f.name);
      setV({
        body_image_name: f.name,
        body_image_size: f.size,
        body_image_attached: true,
        body_image_mime: f.type || undefined,
        // mark upload pending
        body_image_uploaded: false,
        body_image_upload_error: undefined,
      } as any);
      persistNow({
        body_image_name: f.name,
        body_image_size: f.size,
        body_image_attached: true,
        body_image_mime: f.type || undefined,
        body_image_uploaded: false,
        body_image_upload_error: undefined,
      });
    }

    // background upload to server/CDN; when URL returns, persist it into answers
    try {
      const uploaded =
        (typeof window !== 'undefined' && typeof window.peUploadIntakeImage === 'function')
          ? await window.peUploadIntakeImage(f, kind)
          : await uploadIntakeImage(f, kind);

      const ok = !!(uploaded && (uploaded.ok || uploaded.url || uploaded.path));
      if (ok) {
        if (kind === 'scale') {
          setV({
            scale_image_url: uploaded?.url || undefined,
            scale_image_path: uploaded?.path || undefined,
            scale_image_uploaded: true,
            scale_image_upload_error: undefined,
          } as any);
          persistNow({
            scale_image_url: uploaded?.url || undefined,
            scale_image_path: uploaded?.path || undefined,
            scale_image_uploaded: true,
            scale_image_upload_error: undefined,
          });
        } else {
          setV({
            body_image_url: uploaded?.url || undefined,
            body_image_path: uploaded?.path || undefined,
            body_image_uploaded: true,
            body_image_upload_error: undefined,
          } as any);
          persistNow({
            body_image_url: uploaded?.url || undefined,
            body_image_path: uploaded?.path || undefined,
            body_image_uploaded: true,
            body_image_upload_error: undefined,
          });
        }
      } else {
        if (kind === 'scale') {
          setV({ scale_image_uploaded: false, scale_image_upload_error: 'upload_failed' } as any);
          persistNow({ scale_image_uploaded: false, scale_image_upload_error: 'upload_failed' });
        } else {
          setV({ body_image_uploaded: false, body_image_upload_error: 'upload_failed' } as any);
          persistNow({ body_image_uploaded: false, body_image_upload_error: 'upload_failed' });
        }
      }
    } catch {
      // network/other error – mark failure
      if (kind === 'scale') {
        setV({ scale_image_uploaded: false, scale_image_upload_error: 'upload_failed' } as any);
        persistNow({ scale_image_uploaded: false, scale_image_upload_error: 'upload_failed' });
      } else {
        setV({ body_image_uploaded: false, body_image_upload_error: 'upload_failed' } as any);
        persistNow({ body_image_uploaded: false, body_image_upload_error: 'upload_failed' });
      }
    }

    // if body image selected, now finish the flow
    if (kind === 'body') {
      onComplete?.();
    }
  }

  useEffect(() => {
    return () => {
      if (scalePreview) URL.revokeObjectURL(scalePreview)
      if (bodyPreview) URL.revokeObjectURL(bodyPreview)
    }
  }, [scalePreview, bodyPreview])

  const handleHeightChange = (v: string) => {
    const raw = numOrEmpty(v);
    setHeight(raw);
    if (raw === '') {
      setV({ height_input: '', height_cm: undefined } as any);
      return;
    }
    const cm = metricH ? Number(raw) : Number(raw) * 2.54;
    setV({ height_input: Number(raw), height_metric: metricH, height_cm: r1(cm) } as any);
  };

  const handleWeightChange = (v: string) => {
    const raw = numOrEmpty(v);
    setWeight(raw);
    if (raw === '') {
      setV({ weight_input: '', weight_kg: undefined } as any);
      return;
    }
    const kg = metricW ? Number(raw) : Number(raw) * 0.45359237;
    setV({ weight_input: Number(raw), weight_metric: metricW, weight_kg: r1(kg) } as any);
  };

  const handleMetricH = (next: boolean) => {
    setMetricH(next);
    if (height !== '') {
      const cm = next ? Number(height) : Number(height) * 2.54;
      setV({ height_metric: next, height_input: Number(height), height_cm: r1(cm) } as any);
    } else {
      setV({ height_metric: next } as any);
    }
  };

  const handleMetricW = (next: boolean) => {
    setMetricW(next);
    if (weight !== '') {
      const kg = next ? Number(weight) : Number(weight) * 0.45359237;
      setV({ weight_metric: next, weight_input: Number(weight), weight_kg: r1(kg) } as any);
    } else {
      setV({ weight_metric: next } as any);
    }
  };

  return (
    <div className="space-y-6">
      {showDebug && (
        <div className="text-xs bg-gray-900 text-white rounded px-3 py-2">
          about you • q {q} • answered {totals.answered} of {totals.total}
        </div>
      )}
      {showDebug && <DebugUploads value={value as any} />}
      {/* greeting */}
      <Card>
        <p className="text-xl font-semibold">Hi {firstName} 👋</p>
        <p className="text-sm text-gray-600 mt-2">
          Do not order medication for another patient or order multiple weight loss medications for different patients on a single order. Please register separate accounts for each patient.
        </p>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (!value.about_ack) setV({ about_ack: true } as any)
              advanceTo(1)
            }}
            className={[
              'px-5 py-2 rounded-full border text-emerald-700 hover:bg-emerald-50',
              value.about_ack
                ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-600'
                : 'border-emerald-600'
            ].join(' ')}
            aria-pressed={value.about_ack ? 'true' : 'false'}
          >
            I understand
          </button>
        </div>
      </Card>

      {/* age only after I understand */}
      <Reveal show={q >= 1}>
        <Card>
          <Q>Are you aged between 18 and 85</Q>
          {value.age_18_to_85 === false && (
            <p className="text-sm font-semibold text-red-600 mt-2">
              Weight loss treatments are not licensed for patients under 18 or over 85
            </p>
          )}
          <RightBtns>
            <Pill
              active={value.age_18_to_85 === true}
              onClick={() => {
                if (value.age_18_to_85 !== true) setV({ age_18_to_85: true })
                setTimeout(() => advanceTo(2), 120)
              }}
            >
              Yes
            </Pill>
            <Pill
              active={value.age_18_to_85 === false}
              onClick={() => {
                if (value.age_18_to_85 !== false) setV({ age_18_to_85: false })
              }}
            >
              No
            </Pill>
          </RightBtns>
        </Card>
      </Reveal>

      {/* ethnicity auto advance on select */}
      <Reveal show={q >= 2}>
        <Card>
          <TwoCol>
            <div>
              <Q>What is your ethnicity</Q>
              <Hint>
                We consider ethnicity when assessing BMI due to higher health risks at lower BMI for some groups
              </Hint>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  'South Asian',
                  'Chinese',
                  'Middle Eastern',
                  'Other Asian',
                  'Black African',
                  'African-Caribbean',
                  'None of the above',
                ].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="ethnicity"
                      className="accent-emerald-600"
                      checked={(value.ethnicity || [])[0] === opt}
                      onChange={() => {
                        setV({ ethnicity: [opt] as any })
                        setTimeout(() => advanceTo(3), 120)
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <span />{/* empty right column keeps layout aligned */}
          </TwoCol>
        </Card>
      </Reveal>

      {/* pregnancy with auto advance when text entered */}
      <Reveal show={q >= 3}>
        <Card>
          <Q>Are you breast feeding pregnant or planning to become pregnant</Q>
          <Hint>
            If planning pregnancy stop Mounjaro one month before and Wegovy eight weeks before trying to conceive
          </Hint>

          <RightBtns>
            <Pill
              active={value.pregnant_or_breastfeeding_or_planning === true}
              onClick={() => setV({ pregnant_or_breastfeeding_or_planning: true })}
            >
              Yes
            </Pill>
            <Pill
              active={value.pregnant_or_breastfeeding_or_planning === false}
              onClick={() => {
                setV({ pregnant_or_breastfeeding_or_planning: false, preg_text: '' } as any)
                setTimeout(() => advanceTo(4), 120)
              }}
            >
              No
            </Pill>
          </RightBtns>

          {value.pregnant_or_breastfeeding_or_planning === true && (
            <>
              <hr className="my-4 border-gray-200" />
              <p className="font-semibold text-gray-800">Tell us if breastfeeding or how many weeks pregnant</p>
              <textarea
                rows={4}
                className="mt-3 w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="eg Breastfeeding 3 months postpartum or Pregnant 18 weeks"
                value={pregText}
                onChange={(e) => setV({ preg_text: e.target.value } as any)}
              />
            </>
          )}
        </Card>
      </Reveal>

      {/* bmi auto advance when valid */}
      <Reveal show={q >= 4}>
        <Card>
          <Q>What is your BMI</Q>
          <Hint>New patients need BMI over 20.5 kg m² with one weight related comorbidity</Hint>

          <div className="grid md:grid-cols-2 gap-6 mt-4 items-start">
            <div className="space-y-4">
              <Label>Enter your height</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-40 border rounded-md p-2"
                  placeholder={metricH ? 'cm' : 'inches'}
                  value={height}
                  onChange={(e) => handleHeightChange(e.target.value)}
                />
                <Toggle label="Metric" checked={metricH} onChange={handleMetricH} />
              </div>

              <Label>Enter your weight</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-40 border rounded-md p-2"
                  placeholder={metricW ? 'kg' : 'lbs'}
                  value={weight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                />
                <Toggle label="Metric" checked={metricW} onChange={handleMetricW} />
              </div>
            </div>

            {(() => {
              const BMI_MIN = 20.5
              const haveCalcInputs = height !== '' && weight !== ''
              const haveBmi = effectiveBmi !== null
              const bmiValid = haveBmi && (effectiveBmi as number) >= BMI_MIN
              return (
                <div className="flex flex-col items-end w-full">
                  <p className="text-sm mt-4">
                    <span className="font-semibold">Your BMI is</span>{' '}
                    {haveBmi ? (effectiveBmi as number).toFixed(1) : '--'}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      !haveBmi ? 'text-gray-500'
                      : bmiValid ? 'text-emerald-700'
                      : 'text-red-600'
                    }`}
                  >
                    {!haveBmi
                      ? (haveCalcInputs
                          ? 'Enter height and weight to calculate BMI'
                          : 'BMI will appear once entered or from your saved answers')
                      : bmiValid
                      ? 'Eligible to proceed—moving on'
                      : `Minimum BMI to proceed is ${BMI_MIN}. Contact us for advice`}
                  </p>
                </div>
              )
            })()}
          </div>
        </Card>
      </Reveal>

      {/* target auto advance */}
      <Reveal show={q >= 5}>
        <Card>
          <TwoCol>
            <Q>What is your target weight</Q>
            <div className="md:justify-self-end w-full">
              <textarea
                rows={3}
                className="w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Enter target weight"
                value={((value as any).target_weight || '') as string}
                onChange={(e) => setV({ target_weight: e.target.value } as any)}
              />
            </div>
          </TwoCol>
        </Card>
      </Reveal>

      {/* scale photo auto advance on select */}
      <Reveal show={q >= 6}>
        <Card>
          <TwoCol>
            <div>
              <Q>Upload a photo of you on weighing scales mandatory</Q>
              <ul className="list-disc ml-5 mt-3 text-sm space-y-1">
                <li>Show the weight reading plus legs and feet</li>
                <li>Show a paper with todays date</li>
                <li>Make sure it is clear and well lit</li>
              </ul>
              <img
                src="/assessment/upload-weight.png"
                alt="Example scale photo"
                width={190}
                height={150}
                className="mt-2 max-w-sm rounded-md border"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            </div>

            <div className="md:justify-self-end w-full flex flex-col items-end gap-3">
              <UploadButton onFile={(f) => handleFile(f, 'scale')} />
              {(() => {
                const hasAny = !!(((value as any).scale_image_attached || (value as any).scale_image_url || (value as any).scale_image_path) || scalePreview);
                if (!hasAny) return <ReqNote show />;
                const uploaded = !!(value as any).scale_image_uploaded;
                const url = (value as any).scale_image_url as string | undefined;
                const path = (value as any).scale_image_path as string | undefined;
                const label =
                  (scaleName as string) ||
                  (value as any).scale_image_name ||
                  baseName(path) ||
                  baseName(url) ||
                  'Image selected';
                return (
                  <div className="w-full flex flex-col items-end gap-2">
                    {url ? (
                      <img src={url} alt="Scale image" className="max-h-24 rounded border" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Preview ok={uploaded} name={label as string} />
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="text-xs underline text-emerald-700">Open</a>
                      ) : null}
                      <span className="text-[11px] px-2 py-0.5 rounded-full border"
                        style={{borderColor: uploaded ? '#059669' : (value as any).scale_image_upload_error ? '#dc2626' : '#6b7280', color: uploaded ? '#065f46' : (value as any).scale_image_upload_error ? '#991b1b' : '#374151'}}>
                        {uploaded ? 'Uploaded' : (value as any).scale_image_upload_error ? 'Upload failed' : 'Pending upload'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </TwoCol>
        </Card>
      </Reveal>

      {/* body photo finishes flow */}
      <Reveal show={q >= 7}>
        <Card>
          <Q>Upload a full body photo mandatory</Q>
          <div className="grid md:grid-cols-[1fr,320px] gap-6 mt-5 items-start">
            <div>
              <ul className="list-disc ml-5 mt-3 text-sm space-y-1">
                <li>Front facing head to toe</li>
                <li>Hold a paper with todays date</li>
                <li>Clear background in focus</li>
                <li>Single layer fitted clothing</li>
              </ul>
              <img
                src="/assessment/upload-verification.png"
                alt="Full body photo examples"
                width={220}
                height={220}
                className="max-w-sm rounded-md border mt-2"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            </div>

            <div className="flex flex-col items-end gap-3">
              <UploadButton onFile={(f) => handleFile(f, 'body')} />
              {(() => {
                const hasAny = !!(((value as any).body_image_attached || (value as any).body_image_url || (value as any).body_image_path) || bodyPreview);
                if (!hasAny) return <ReqNote show />;
                const uploaded = !!(value as any).body_image_uploaded;
                const url = (value as any).body_image_url as string | undefined;
                const path = (value as any).body_image_path as string | undefined;
                const label =
                  (bodyName as string) ||
                  (value as any).body_image_name ||
                  baseName(path) ||
                  baseName(url) ||
                  'Image selected';
                return (
                  <div className="w-full flex flex-col items-end gap-2">
                    {url ? (
                      <img src={url} alt="Body image" className="max-h-24 rounded border" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Preview ok={uploaded} name={label as string} />
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="text-xs underline text-emerald-700">Open</a>
                      ) : null}
                      <span className="text-[11px] px-2 py-0.5 rounded-full border"
                        style={{borderColor: uploaded ? '#059669' : (value as any).body_image_upload_error ? '#dc2626' : '#6b7280', color: uploaded ? '#065f46' : (value as any).body_image_upload_error ? '#991b1b' : '#374151'}}>
                        {uploaded ? 'Uploaded' : (value as any).body_image_upload_error ? 'Upload failed' : 'Pending upload'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </Card>
      </Reveal>

      {(onBack || onComplete) && (
        <div className="mt-8 flex items-center justify-between">
          {showDebug && !isAboutYouComplete(value) && (
            <div className="text-xs text-red-600">Missing: {aboutYouMissingReasons(value).join(', ')}</div>
          )}
          <button
            type="button"
            onClick={backToProducts}
            className="px-4 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            Back
          </button>
          {isAboutYouComplete(value) && (
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


function DebugUploads({ value }: { value: any }) {
  const [checking, setChecking] = useState(false);
  const [scaleOk, setScaleOk] = useState<null | boolean>(null);
  const [bodyOk, setBodyOk] = useState<null | boolean>(null);

  const tryHead = async (url?: string) => {
    if (!url) return null;
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (res.ok) return true;
      // Some hosts disallow HEAD; fall back to GET with a small byte-range
      const getRes = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-64' }, cache: 'no-store' });
      return getRes.ok;
    } catch {
      return false;
    }
  };

  const verify = async () => {
    setChecking(true);
    setScaleOk(await tryHead(value?.scale_image_url));
    setBodyOk(await tryHead(value?.body_image_url));
    setChecking(false);
  };

  const Item = (label: string, ok: null | boolean, url?: string, uploaded?: boolean, err?: string) => (
    <div className="text-xs">
      <div className="font-semibold">{label}</div>
      <div>uploaded flag: {uploaded === undefined ? '—' : uploaded ? 'true' : 'false'}</div>
      <div>error: {err || '—'}</div>
      <div className="truncate">url: {url || '—'}</div>
      <div>reachable: {ok === null ? '—' : ok ? 'yes' : 'no'}</div>
    </div>
  );

  return (
    <div className="mt-2 rounded border border-dashed border-gray-300 p-3 text-gray-700">
      <div className="text-xs font-medium mb-2">Upload debug</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Item('Scale image', scaleOk, value?.scale_image_url, value?.scale_image_uploaded, value?.scale_image_upload_error)}
        {Item('Body image', bodyOk, value?.body_image_url, value?.body_image_uploaded, value?.body_image_upload_error)}
      </div>
      <div className="mt-2">
        <button
          type="button"
          disabled={checking}
          onClick={verify}
          className="px-3 py-1 rounded-full border border-gray-400 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {checking ? 'Checking…' : 'Verify URLs'}
        </button>
      </div>
    </div>
  );
}

/* ui helpers */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white p-6">{children}</div>
}
function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-[1fr,420px] gap-6 items-start">{children}</div>
}
function Q({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-gray-800">{children}</p>
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 mt-2">{children}</p>
}
function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div className={`transition-all duration-200 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none hidden'}`}>
      {children}
    </div>
  )
}
function RightBtns({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 items-center md:justify-end mt-3">{children}</div>
}
function Action({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-5 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
    >
      {children}
    </button>
  )
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-700">{children}</p>
}
function Pill({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-6 py-2 rounded-full border text-sm ${active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'}`}
    >
      {children}
    </button>
  )
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <span>{label}</span>
      <span className="relative inline-flex items-center">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={() => onChange(!checked)} />
        <span className="block w-12 h-6 rounded-full border border-gray-300 bg-gray-200 transition-colors peer-checked:bg-emerald-600 peer-checked:border-emerald-600" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6" />
      </span>
    </label>
  )
}
function UploadButton({ onFile }: { onFile: (f: File | null) => void }) {
  return (
    <label className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 cursor-pointer">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
      />
      <span>Upload Image</span>
    </label>
  )
}
function computeBMI(
  height: number | '',
  weight: number | '',
  metricH: boolean,
  metricW: boolean
): number | null {
  if (height === '' || weight === '') return null
  const cm = metricH ? Number(height) : Number(height) * 2.54
  const kg = metricW ? Number(weight) : Number(weight) * 0.45359237
  if (!Number.isFinite(cm) || !Number.isFinite(kg) || cm <= 0 || kg <= 0) return null
  const m = cm / 100
  const raw = kg / (m * m)
  return Number.isFinite(raw) ? raw : null
}
function Preview({ ok, name }: { ok?: boolean; name: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-gray-300'}`} />
      <span className="truncate max-w-[240px]">{name}</span>
    </div>
  )
}
function ReqNote({ show }: { show: boolean }) {
  return show ? <p className="text-xs text-red-600 mt-1">Upload required to continue</p> : null
}

/* utils */

function numOrEmpty(v: string): number | '' {
  if (v === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : ''
}
function computeBMIFromValue(v: any): number | null {
  const hIn = v?.height_input
  const wIn = v?.weight_input
  const hMetric = typeof v?.height_metric === 'boolean' ? v.height_metric : true
  const wMetric = typeof v?.weight_metric === 'boolean' ? v.weight_metric : true
  if (hIn === '' || wIn === '' || hIn === undefined || wIn === undefined) return null
  const cm = hMetric ? Number(hIn) : Number(hIn) * 2.54
  const kg = wMetric ? Number(wIn) : Number(wIn) * 0.45359237
  if (!Number.isFinite(cm) || !Number.isFinite(kg) || cm <= 0 || kg <= 0) return null
  const m = cm / 100
  const raw = kg / (m * m)
  return Number.isFinite(raw) ? raw : null
}

function isAboutYouComplete(v: any): boolean {
  const ageOK = typeof v.age_18_to_85 === 'boolean' ? v.age_18_to_85 : v.age_18_to_74 === true
  const ethnicityOK = Array.isArray(v.ethnicity) && v.ethnicity.length > 0
  const pregOK = typeof v.pregnant_or_breastfeeding_or_planning === 'boolean'
  const needsPregDetail = v.pregnant_or_breastfeeding_or_planning === true
  const pregDetailOK = needsPregDetail ? !!((v.preg_text || '').toString().trim()) : true

  // Accept BMI from saved v.bmi or derive from saved height/weight if missing
  const bmiSaved = typeof v.bmi === 'number' ? v.bmi : null
  const bmiDerived = bmiSaved === null ? computeBMIFromValue(v) : bmiSaved
  const bmiOK = typeof bmiDerived === 'number' && Number.isFinite(bmiDerived) && bmiDerived >= 20.5

  const targetOK = !!(v.target_weight || '').toString().trim()
  const scaleOK = !!(v.scale_image_attached || v.scale_image_url || v.scale_image_path)
  const bodyOK  = !!(v.body_image_attached  || v.body_image_url  || v.body_image_path)

  return ageOK && ethnicityOK && pregOK && pregDetailOK && bmiOK && targetOK && scaleOK && bodyOK
}

function aboutYouMissingReasons(v: any): string[] {
  const reasons: string[] = []
  if (!(typeof v.age_18_to_85 === 'boolean' ? v.age_18_to_85 : v.age_18_to_74 === true)) reasons.push('Confirm age 18–85')
  if (!(Array.isArray(v.ethnicity) && v.ethnicity.length > 0)) reasons.push('Select ethnicity')
  if (!(typeof v.pregnant_or_breastfeeding_or_planning === 'boolean')) reasons.push('Answer pregnancy/breastfeeding/planning')
  if (v.pregnant_or_breastfeeding_or_planning === true && !((v.preg_text || '').toString().trim())) reasons.push('Enter pregnancy/breastfeeding detail')
  const bmiSaved = typeof v.bmi === 'number' ? v.bmi : null
  const bmiDerived = bmiSaved === null ? computeBMIFromValue(v) : bmiSaved
  if (!(typeof bmiDerived === 'number' && Number.isFinite(bmiDerived) && bmiDerived >= 20.5)) reasons.push('BMI must be ≥ 20.5')
  if (!((v.target_weight || '').toString().trim())) reasons.push('Enter target weight')
  if (!(v.scale_image_attached || v.scale_image_url || v.scale_image_path)) reasons.push('Upload scale photo')
  if (!(v.body_image_attached  || v.body_image_url  || v.body_image_path)) reasons.push('Upload body photo')
  return reasons
}

function aboutYouTotals(v: any): { answered: number; total: number } {
  const needsPregDetail = v.pregnant_or_breastfeeding_or_planning === true

  let total = 1 /* greeting */ + 7 + (needsPregDetail ? 1 : 0)
  let answered = 0

  if (v.about_ack === true) answered++

  if (typeof v.age_18_to_85 === 'boolean') answered++
  if (Array.isArray(v.ethnicity) && v.ethnicity.length > 0) answered++
  if (typeof v.pregnant_or_breastfeeding_or_planning === 'boolean') answered++
  if (needsPregDetail && ((v.preg_text || '') + '').trim()) answered++
  if (typeof v.bmi === 'number' && v.bmi >= 20.5) answered++
  if ((v.target_weight ?? '').toString().trim()) answered++
  if (v.scale_image_attached || v.scale_image_url || v.scale_image_path) answered++
  if (v.body_image_attached  || v.body_image_url  || v.body_image_path) answered++

  return { answered, total }
}