'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { useMemo, useState, useEffect } from 'react'

// ---- Auth cookie helpers ----
const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Expires=${expires}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
}
function clearCookie(name: string) {
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}
function setAuthCookies(token?: string | null) {
  if (!token) {
    clearCookie('auth_token');
    clearCookie('token');
    clearCookie('logged_in');
    return;
  }
  setCookie('auth_token', token);
  setCookie('token', token);
  setCookie('logged_in', '1');
}

function saveAuthToStorage(token?: string | null, user?: any) {
  try {
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  } catch {}
}

function announceAuthChange() {
  try {
    window.dispatchEvent(new CustomEvent('pe-auth-changed'));
  } catch {}
}
type SearchParams = Record<string, string | string[] | undefined>

const getFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)
const readParam = (name: string, initial: SearchParams) => {
  const fromInitial = getFirst(initial[name])
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search)
    return fromInitial ?? sp.get(name) ?? undefined
  }
  return fromInitial
}

export default function ClientCheckout({ initialSearch }: { initialSearch: SearchParams }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrlParam = readParam('return', initialSearch)
  const nextUrlParam = readParam('next', initialSearch) || returnUrlParam
  const defaultNextUrl = useMemo(() => {
    const qpNext = readParam('next', initialSearch) || readParam('return', initialSearch)
    if (qpNext) return qpNext

    try {
      const ref = document.referrer || ''
      const refPath = ref ? new URL(ref, window.location.href).pathname : ''
      const cameFromBooking = refPath.startsWith('/weight-loss') || refPath.startsWith('/booking')
      const kind = (readParam('type', initialSearch) as 'new' | 'transfer' | undefined) || 'new'
      if (cameFromBooking || readParam('type', initialSearch)) return `/private-services/weight-loss/intake?type=${kind}`
    } catch {}

    return '/account'
  }, [initialSearch])

  // Auto-login: if a valid token is already saved, verify and skip to /intake
  useEffect(() => {
    let cancelled = false;

    const checkExistingSession = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/users/me', {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled && res.ok) {
          // Try to read the user payload from /api/users/me
          let user: any = null;
          try {
            const j = await res.json();
            user = j?.user ?? j ?? null;
          } catch {}
          // Sync localStorage & cookies so the rest of the app (and SSR) can see auth
          try {
            const tokenNow = localStorage.getItem('token');
            saveAuthToStorage(tokenNow, user || undefined);
            setAuthCookies(tokenNow);
            announceAuthChange();
          } catch {}
          // Already authenticated — go straight to intake
          const target = nextUrlParam || defaultNextUrl;
          router.replace(target);
          // Hard fallback in case client-side navigation is blocked
          setTimeout(() => {
            if (window.location.pathname.startsWith('/auth')) {
              window.location.assign(target);
            }
          }, 100);
        } else if (!cancelled && res.status === 401) {
          // Token is invalid/expired — clear it so the user can log in cleanly
          try { localStorage.removeItem('token'); } catch {}
        }
      } catch {
        // Ignore network errors — user can still log in manually
      }
    };

    checkExistingSession();
    return () => { cancelled = true; };
  }, [router, nextUrlParam]);
  const [pwHelpVisible, setPwHelpVisible] = useState(false)
  const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;               // letters + space/’/-
  const PHONE_CHARS_RE = /^[0-9 +()\-]+$/;                 // digits + common phone symbols
  const PW_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{10,}$/; // 10+, 1 upper, 1 lower, 1 digit, 1 special
  // after you get the user object back from your API
 
// Sanitizers
  const onlyDigits = (s: string) => s.replace(/\D+/g, '');
  const keepPhoneChars = (s: string) => s.replace(/[^0-9 +()\-]/g, '');
  const keepNameChars  = (s: string) => s.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, '');
  const showRegister = searchParams.get('register') === '1'

    // ----------------- Login state -----------------
  const [login, setLogin] = useState({ email: '', password: '' })
  const [loginErr, setLoginErr] = useState<string | null>(null)
  const uLogin = <K extends keyof typeof login>(k: K, v: typeof login[K]) =>
    setLogin(s => ({ ...s, [k]: v }))

  // ----------------- Register state -----------------
  const [reg, setReg] = useState({
    first: '', last: '', gender: '',
    phone: '',
    day: '', month: '', year: '',
    email: '', pass1: '', pass2: '',
    postcode: '', address1: '', address2: '', city: '', country: 'United Kingdom',
    marketing: false, terms: false,
  })
  const u = <K extends keyof typeof reg>(k: K, v: typeof reg[K]) =>
    setReg(s => ({ ...s, [k]: v }))

  // ----------------- Validation helpers -----------------
  const [errors, setErrors] = useState<Record<string, string>>({})
  const hasErr = (k: keyof typeof reg) => Boolean(errors[k])
  const errCls = (k: keyof typeof reg) =>
    `border-2 ${hasErr(k) ? 'border-red-600' : 'border-black'}`

  function validate() {
    const e: Record<string, string> = {};

    // required (Address 2 excluded)
    const required: Array<[keyof typeof reg, string]> = [
      ['first','First name'], ['last','Last name'], ['gender','Gender'], ['phone','Contact no'],
      ['day','Day'], ['month','Month'], ['year','Year'],
      ['email','Email'], ['pass1','Password'], ['pass2','Re-enter password'],
      ['postcode','Postcode/ZIP'], ['address1','Address 1'], ['city','City'], ['country','Country'],
    ];
    required.forEach(([k, label]) => {
      const v = String(reg[k] ?? '').trim();
      if (!v) e[k] = `${label} is required`;
    });

    // Names
    if (reg.first && !NAME_RE.test(reg.first)) e.first = 'Letters only (you may use space, apostrophe, hyphen)';
    if (reg.last  && !NAME_RE.test(reg.last))  e.last  = 'Letters only (you may use space, apostrophe, hyphen)';

    // Phone
    const phoneSan = reg.phone.trim();
    if (phoneSan && !PHONE_CHARS_RE.test(phoneSan)) e.phone = 'Use digits and + ( ) - only';
    // Count digits only for length check
    const phoneDigits = (phoneSan.match(/\d/g) ?? []).length;
    if (!e.phone && phoneDigits < 7) e.phone = 'Enter a valid phone number';

    // Email
    if (reg.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email))
      e.email = 'Enter a valid email';

    // Password
    if (reg.pass1 && !PW_RE.test(reg.pass1))
      e.pass1 = 'Password must be 10+ chars, include upper, lower, number, special';
    if (reg.pass1 !== reg.pass2)
      e.pass2 = 'Passwords do not match';

    // DOB numeric + ranges
    const d = Number(reg.day), m = Number(reg.month), y = Number(reg.year);
    const numericDob = /^\d+$/.test(reg.day) && /^\d+$/.test(reg.month) && /^\d+$/.test(reg.year);
    const dateOk = numericDob && d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100;
    if (!dateOk) e.day = 'Enter a valid date of birth';

    // Terms
    if (!reg.terms) e.terms = 'You must accept the terms';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function setPatientIdentityFromRegister(v: { first: string; last: string; email: string; phone: string }) {
    const full = `${v.first || ''} ${v.last || ''}`.trim()
    try {
      localStorage.setItem('patient_name', full)
      localStorage.setItem('patient_email', v.email || '')
      localStorage.setItem('patient_phone', v.phone || '')
    } catch {}
  }




  // ----------------- Address lookup -----------------
  const [addrOptions, setAddrOptions] = useState<string[]>([])
  const [addrSelected, setAddrSelected] = useState('')
  const [loadingAddr, setLoadingAddr] = useState(false)
  const [showManual, setShowManual] = useState(false)

  function clearAddress() {
    setAddrOptions([])
    setAddrSelected('')
    u('address1', '')
    u('address2', '')
    u('city', '')
  }
  
  async function findAddress() {
    const pc = reg.postcode.trim()
    if (!pc) {
      setErrors(e => ({ ...e, postcode: 'Postcode/ZIP is required' }))
      return
    }
    setLoadingAddr(true)
    try {
      const res = await fetch(`/api/postcode?postcode=${encodeURIComponent(pc)}`)
      const data = await res.json()
      if (!res.ok || !Array.isArray(data.addresses) || data.addresses.length === 0) {
        setAddrOptions([])
        setAddrSelected('')
        setErrors(e => ({ ...e, postcode: 'No addresses found for this postcode' }))
        return
      }
      setAddrOptions(data.addresses)
      setAddrSelected('')
      setShowManual(false)
      setErrors(e => {
        const { postcode, ...rest } = e
        return rest
      })
    } catch {
      setErrors(e => ({ ...e, postcode: 'Could not search address right now' }))
    } finally {
      setLoadingAddr(false)
    }
  }

  function applySelectedAddress(v: string) {
    setAddrSelected(v)
    const parts = v.split(',').map(s => s.trim()).filter(Boolean)
    const cityGuess = parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1] ?? ''
    const line1 = parts.slice(0, parts.length - 2).join(', ') || parts[0] || ''
    u('address1', line1)
    u('city', cityGuess)
  }

  // ----------------- Routing helpers -----------------
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const isRegister = sp.get('register') === '1'
    const hasNextOrReturn = sp.has('next') || sp.has('return')
    if (isRegister && !hasNextOrReturn) {
      sp.set('next', defaultNextUrl)
      router.replace(`/auth?${sp.toString()}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultNextUrl, router])
  function openRegister() {
    const q = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    q.set('register', '1')
    if (!q.get('next')) q.set('next', defaultNextUrl)
    router.replace(`/auth?${q.toString()}`)
  }
  function closeRegister() {
    const q = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    q.delete('register')
    const qs = q.toString()
    router.replace(`/auth${qs ? `?${qs}` : ''}`)
  }

  // ----------------- Submit handlers -----------------
  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault()
    setLoginErr(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: login.email, password: login.password }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setLoginErr(data.message || 'Invalid email or password')
      return
    }

    // Extract token and (if provided) user from the login response
    const token: string | undefined = data?.session_token
    let user: any = data?.user ?? null

    // Persist token immediately
    if (token) {
      try { localStorage.setItem('token', token) } catch {}
    }

    // Verify and fetch user if not present
    try {
      const bearer = token ?? localStorage.getItem('token') ?? ''
      if (bearer && !user) {
        const meRes = await fetch('/api/users/me', {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearer}`,
          },
        })
        if (meRes.ok) {
          const j = await meRes.json().catch(() => null)
          user = j?.user ?? j ?? null
        } else {
          setLoginErr('Could not verify session. Please try logging in again.')
          return
        }
      }
    } catch {
      // ignore network errors here and continue
    }

    // Ensure storage & cookies are set so server-side guards and the header can react
    try {
      saveAuthToStorage(token ?? localStorage.getItem('token'), user || undefined)
      setAuthCookies(token ?? localStorage.getItem('token'))
      announceAuthChange()
    } catch {}

    // success
    const target = nextUrlParam || defaultNextUrl;
    window.location.assign(target);
  }


  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    // 1) Validate locally first
    if (!validate()) return
    if (reg.pass1 !== reg.pass2) { alert('Passwords do not match'); return }
    if (!reg.terms) { alert('Please accept the terms and conditions'); return }

    // 2) Build payload the server route expects
    const payload = {
      firstName: reg.first,
      lastName: reg.last,
      gender: (reg.gender || '').toLowerCase(),
      phone: reg.phone,
      // pad MM/DD to two digits so dob = YYYY-MM-DD
      dob: `${reg.year}-${reg.month.padStart(2,'0')}-${reg.day.padStart(2,'0')}`,
      email: reg.email,
      password: reg.pass1,
      address1: reg.address1,
      address2: reg.address2,
      city: reg.city,
      postcode: reg.postcode,
      country: reg.country,
      marketing: reg.marketing,
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(data.message || 'Registration failed')
        return
      }

      // Save identity for Calendly prefill
      setPatientIdentityFromRegister({
        first: reg.first,
        last: reg.last,
        email: reg.email,
        phone: reg.phone,
      })

      // Persist auth (token + user). Backend usually returns both on register.
      const token: string | undefined = data?.session_token
      let user: any = data?.user ?? null
      if (token) {
        try { localStorage.setItem('token', token) } catch {}
      }

      // Fallback: fetch /me if user wasn't returned
      if (!user && (token ?? localStorage.getItem('token'))) {
        try {
          const bearer = token ?? localStorage.getItem('token') ?? ''
          const meRes = await fetch('/api/users/me', {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${bearer}`,
            },
          })
          if (meRes.ok) {
            const j = await meRes.json().catch(() => null)
            user = j?.user ?? j ?? null
          }
        } catch {}
      }

      // Ensure storage & cookies are set so server-side guards and the header can react
      try {
        saveAuthToStorage(token ?? localStorage.getItem('token'), user || undefined)
        setAuthCookies(token ?? localStorage.getItem('token'))
        announceAuthChange()
      } catch {}

      // Go to the new‑patient intake flow (or whatever "next" was passed in the URL)
      const target = nextUrlParam || defaultNextUrl;
      window.location.assign(target);
    } catch {
      alert('Could not reach the server. Please try again.')
    }
  }


  const loginTitle = useMemo(() => 'Login', [])
  const RegisterTitle = useMemo(() => 'New to our Pharmacy?', [])

  // ================== RENDER ==================
  return (
    <main className="w-full grid grid-cols-1 md:grid-cols-2">
      {/* LEFT: Login */}
      <section className="bg-black text-white px-6 lg:px-12 py-10 lg:py-12">
        <div className="mx-auto w-full max-w-[520px] flex flex-col h-full">
          {/* Title aligned with Register title */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{loginTitle}</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Are you a member already? Log in to your account.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-8 space-y-5 flex-1">
            <div>
              <label className="block mb-2 text-sm">Email</label>
              <input
                type="email"
                className="w-full h-11 bg-white text-black px-4 outline-none"
                value={login.email}
                onChange={e => uLogin('email', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm">Password</label>
              <input
                type="password"
                className="w-full h-11 bg-white text-black px-4 outline-none"
                value={login.password}
                onChange={e => uLogin('password', e.target.value)}
                required
              />
              <Link href="/forgot-password" className="mt-2 inline-block text-xs text-zinc-300 hover:text-white">
                Forgot password?
              </Link>
            </div>

            {loginErr && (
              <p className="text-sm text-red-400">{loginErr}</p>
            )}

            {/* Button aligned to same baseline as Register button */}
            <div className="mt-auto pt-4">
              <button
                type="submit"
                className="w-full h-12 border border-white text-white text-base font-medium tracking-wide hover:bg-white hover:text-black transition"
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* RIGHT: Benefits / Register */}
      <section className="bg-zinc text-black px-6 lg:px-12 py-10 lg:py-12">
        <div className="mx-auto w-full max-w-[520px] flex flex-col h-full">
          {!showRegister ? (
            <div className="flex flex-col min-h-[510px]">
            <div>
            <h1 className="text-3xl font-semibold tracking-tight">{RegisterTitle}</h1>
            <p className="mt-2 text-sm text-zinc-700">
              Create your account to manage your health profile and book faster.
            </p><br/>
                <ul className="space-y-4">
                  {[
                    'Regular email updates from our team',
                    'Edit your details',
                    'Faster checkout',
                    'Re order previous treatments',
                    'Nutrition plans',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-pink-500 text-pink-500">+</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div><br/><br/>

              <button
                onClick={openRegister}
                className="w-full h-12 bg-black text-white text-base font-medium"
              >
                Register now
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Register</h2>
              <p className="mt-2 text-sm text-zinc-700">To register please provide your details using the form below</p>

              <form onSubmit={handleRegister} className="space-y-8">
                {/* Name */}
                <br/><div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm">First name</label>
                    <input
                      className={`w-full h-12 bg-white px-4 ${errCls('first')}`}
                      value={reg.first}
                      onChange={e => u('first', keepNameChars(e.target.value))}
                      inputMode="text"
                      pattern="[A-Za-zÀ-ÖØ-öø-ÿ' -]+"
                    />
                    {errors.first && <p className="text-red-600 text-sm mt-1">{errors.first}</p>}
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Last name</label>
                    <input
                      className={`w-full h-12 bg-white px-4 ${errCls('last')}`}
                      value={reg.last}
                      onChange={e => u('last', keepNameChars(e.target.value))}
                      inputMode="text"
                      pattern="[A-Za-zÀ-ÖØ-öø-ÿ' -]+"
                    />
                    {errors.last && <p className="text-red-600 text-sm mt-1">{errors.last}</p>}
                  </div>
                </div>

                {/* Gender & phone */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm">Gender</label>
                    <select
                      className={`w-full h-12 bg-white px-4 ${errCls('gender')}`}
                      value={reg.gender}
                      onChange={e => u('gender', e.target.value)}
                    >
                      <option value="">Select your gender</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other</option>
                      <option>Prefer not to say</option>
                    </select>
                    {errors.gender && <p className="text-red-600 text-sm mt-1">{errors.gender}</p>}
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Contact no</label>
                    <input
                      placeholder="Enter Your Number starting with 0"
                      className={`w-full h-12 bg-white px-4 ${errCls('phone')}`}
                      value={reg.phone}
                      onChange={e => u('phone', keepPhoneChars(e.target.value))}
                      inputMode="tel"
                      pattern="[0-9 +()\-]+"
                    />
                    {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                  </div>
                </div>

                {/* DOB */}
                <div>
                  <label className="block mb-2 text-sm">Date of birth</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      placeholder="Day"
                      className={`h-12 bg-white px-4 ${errCls('day')}`}
                      value={reg.day}
                      onChange={e => u('day', onlyDigits(e.target.value).slice(0,2))}
                      inputMode="numeric"
                      pattern="[0-9]{1,2}"
                      title="Enter 1 or 2 digits"
                      maxLength={2}
                    />
                    <input
                      placeholder="Month"
                      className={`h-12 bg-white px-4 ${errCls('month')}`}
                      value={reg.month}
                      onChange={e => u('month', onlyDigits(e.target.value).slice(0,2))}
                      inputMode="numeric"
                      pattern="[0-9]{1,2}"
                      title="Enter 1 or 2 digits"
                      maxLength={2}
                    />
                    <input
                      placeholder="Year"
                      className={`h-12 bg-white px-4 ${errCls('year')}`}
                      value={reg.year}
                      onChange={e => u('year', onlyDigits(e.target.value).slice(0,4))}
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      title="Enter 4 digits"
                      maxLength={4}
                    />
                    {errors.day && <p className="text-red-600 text-sm mt-1">{errors.day}</p>}
                  </div>
                </div>

                {/* Account details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm">Email</label>
                    <input
                      type="email"
                      className={`w-full h-12 bg-white px-4 ${errCls('email')}`}
                      value={reg.email}
                      onChange={e => u('email', e.target.value)}
                    />
                    {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                  </div>
                </div>
                
                {/* Passwords */}

                <div>
                  <label className="block mb-2 text-sm">Choose password</label>
                  <input
                    type="password"
                    className={`w-full h-12 bg-white px-4 ${errCls('pass1')}`}
                    value={reg.pass1}
                    onChange={e => { u('pass1', e.target.value); setPwHelpVisible(true); }}
                    onFocus={() => setPwHelpVisible(true)}
                    onBlur={() => setPwHelpVisible(Boolean(reg.pass1))} // hide if empty
                    autoComplete="new-password"
                  />

                  {/* Live checklist: only visible while typing or if there is content */}
                  {pwHelpVisible && (
                    <div
                      className="mt-2 rounded-md border border-gray-300 bg-white p-3 text-xs shadow-sm"
                      role="status"
                      aria-live="polite"
                    >
                      <ul className="space-y-1">
                        <li className={/[A-Z]/.test(reg.pass1) ? "text-green-600" : "text-gray-600"}>• At least one uppercase letter</li>
                        <li className={/[a-z]/.test(reg.pass1) ? "text-green-600" : "text-gray-600"}>• At least one lowercase letter</li>
                        <li className={/\d/.test(reg.pass1) ? "text-green-600" : "text-gray-600"}>• At least one number</li>
                        <li className={/[^A-Za-z0-9]/.test(reg.pass1) ? "text-green-600" : "text-gray-600"}>• At least one special character</li>
                        <li className={reg.pass1.length >= 10 ? "text-green-600" : "text-gray-600"}>• Minimum 10 characters</li>
                      </ul>
                    </div>
                  )}

                  {errors.pass1 && <p className="text-red-600 text-sm mt-1">{errors.pass1}</p>}
                </div>

                <div>
                  <label className="block mb-2 text-sm">Re enter password</label>
                  <input
                    type="password"
                    className={`w-full h-12 bg-white px-4 ${errCls('pass2')}`}
                    value={reg.pass2}
                    onChange={e => u('pass2', e.target.value)}
                    onFocus={() => setPwHelpVisible(false)}  // hide checklist when focusing confirm
                    autoComplete="new-password"
                  />
                  {errors.pass2 && <p className="text-red-600 text-sm mt-1">{errors.pass2}</p>}
                </div>

                    
                {/* Address */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Your address</h3>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 mb-2">
                    <input
                      name="postcode"
                      placeholder="Postcode or ZIP"
                      className={`h-11 bg-white px-4 ${errCls('postcode')}`}
                      value={reg.postcode}
                      onChange={(e) => u('postcode', e.target.value)}
                      aria-invalid={hasErr('postcode')}
                      aria-describedby={hasErr('postcode') ? 'err-postcode' : undefined}
                    />
                    <button
                      type="button"
                      onClick={findAddress}
                      disabled={loadingAddr}
                      className="px-4 h-11 bg-black text-white disabled:opacity-60"
                    >
                      {loadingAddr ? 'Searching…' : 'Find Address'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowManual(v => !v); setAddrOptions([]); setAddrSelected('') }}
                      className="px-3 h-11 border border-black"
                    >
                      {showManual ? 'Use lookup' : 'Manually'}
                    </button>
                  </div>
                  {errors.postcode && <p id="err-postcode" className="text-red-600 text-xs mb-2">{errors.postcode}</p>}

                  {addrOptions.length > 0 && !showManual && (
                    <div className="mb-3">
                      <label className="block mb-1 text-xs">Please select*</label>
                      <select
                        value={addrSelected}
                        onChange={(e) => applySelectedAddress(e.target.value)}
                        className="w-full bg-white px-4 border-2 border-black"
                        size={Math.min(8, addrOptions.length)}
                        aria-label="Address results"
                      >
                        {addrOptions.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-3 mt-2">
                        <button type="button" onClick={clearAddress} className="text-xs underline">
                          Clear results
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <input
                        name="address1"
                        placeholder="Address 1"
                        className={`w-full h-11 bg-white px-4 ${errCls('address1')}`}
                        value={reg.address1}
                        onChange={e => u('address1', e.target.value)}
                      />
                      {errors.address1 && <p className="text-red-600 text-xs mt-1">{errors.address1}</p>}
                    </div>

                    <input
                      name="address2"
                      placeholder="Address 2 (optional)"
                      className="w-full h-11 bg-white px-4 border-2 border-black"
                      value={reg.address2}
                      onChange={e => u('address2', e.target.value)}
                    />

                    <div>
                      <input
                        name="city"
                        placeholder="City"
                        className={`w-full h-11 bg-white px-4 ${errCls('city')}`}
                        value={reg.city}
                        onChange={e => u('city', e.target.value)}
                      />
                      {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
                    </div>

                    <div>
                      <select
                        name="country"
                        className={`w-full h-11 bg-white px-4 ${errCls('country')}`}
                        value={reg.country}
                        onChange={e => u('country', e.target.value)}
                      >
                        <option value="">Select country</option>
                        <option>United Kingdom</option>
                      </select>
                      {errors.country && <p className="text-red-600 text-xs mt-1">{errors.country}</p>}
                    </div>
                  </div>
                </div>

                {/* Consents */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={reg.marketing}
                      onChange={e => u('marketing', e.target.checked)}
                    />
                    I would like to be sent special offers and discount codes
                  </label>
                  <div>
                    <label className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={reg.terms}
                        onChange={e => u('terms', e.target.checked)}
                      />
                      I confirm I have read and accept the terms and conditions of service
                    </label>
                    {errors.terms && <p className="text-red-600 text-sm mt-1">{errors.terms}</p>}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={closeRegister} className="w-full h-12 border border-black">
                    Back
                  </button>
                  <button type="submit" className="w-full h-12 bg-black text-white">
                    Register now
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
