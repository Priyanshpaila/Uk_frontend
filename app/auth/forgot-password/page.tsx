'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null); setErr(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      // Always show a generic success message to avoid account enumeration
      setMsg('If an account exists for that address, a reset link has been sent.')
      if (!res.ok) {
        // still show generic success, but log if needed
        console.warn('forgot-password failed', await res.text())
      }
    } catch (e) {
      console.error(e)
      setErr('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function login(e?: React.FormEvent) {
    e?.preventDefault()
    // TODO: normal login submit or navigate
    router.push('/intake')
  }

  return (
    <main className="w-full grid grid-cols-1 md:grid-cols-2">
      {/* LEFT: Login */}
      <section className="bg-black text-white px-8 lg:px-12 py-10 lg:py-12">
        <div className="mx-auto w-full max-w-[600px]">
          <h1 className="text-[56px] leading-[1.05] font-semibold mb-6">Login</h1>
          <p className="text-[18px] text-zinc-300 mb-10">
            Are you a member already? Use the form below to log in to your account
          </p>

          <form onSubmit={login} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm">Email</label>
              <input type="email" className="w-full h-12 bg-white text-black px-4 outline-none" required />
            </div>

            <div>
              <label className="block mb-2 text-sm">Password</label>
              <input type="password" className="w-full h-12 bg-white text-black px-4 outline-none" required />
              <Link href="/forgot-password" className="mt-2 inline-block text-sm text-zinc-300 hover:text-white">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full h-14 border border-white text-white text-lg tracking-wide hover:bg-white hover:text-black transition"
            >
              Login
            </button>
          </form>
        </div>
      </section>

      {/* RIGHT: Reset password */}
      <section className="bg-zinc-100 text-black px-8 lg:px-12 py-10 lg:py-12">
        <div className="mx-auto w-full max-w-[600px]">
          <h2 className="text-[40px] leading-[1.05] font-semibold mb-4">Reset password</h2>
          <p className="text-[16px] text-zinc-700 mb-8 max-w-[780px]">
            Enter the email address associated with your account and we will email you details on how to reset your password.
          </p>

          <form onSubmit={submit} className="space-y-6 max-w-[980px]">
            <div>
              <label className="block mb-2 text-sm">Email address</label>
              <input
                type="email"
                required
                className="w-full h-12 bg-white px-4 border border-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-14 bg-black text-white text-lg tracking-wide hover:bg-gray-900 transition disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Reset password'}
            </button>

            {msg && <p className="text-green-700 text-sm">{msg}</p>}
            {err && <p className="text-red-600 text-sm">{err}</p>}
          </form>
        </div>
      </section>
    </main>
  )
}
