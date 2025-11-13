'use client'
import { useEffect, useState } from 'react'

export type GpPick = { id: string; name: string; address: string }
type Mode = 'editing' | 'locked'

export default function GpPicker({
  initial,
  onPick,
}: {
  initial?: { nameAddress?: string; name?: string; address?: string; id?: string }
  onPick: (gp: GpPick) => void
}) {
  const [mode, setMode] = useState<Mode>(initial?.nameAddress?.trim() ? 'locked' : 'editing')
  const [searchQ, setSearchQ] = useState(initial?.nameAddress || '')
  const [list, setList] = useState<GpPick[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'editing') return
    const q = searchQ.trim()
    if (q.length < 2) { setList([]); setErr(null); return }

    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        setLoading(true); setErr(null)
        const res = await fetch(`/api/gp-search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, cache: 'no-store' })
        const data = await res.json()
        setList(Array.isArray(data?.items) ? data.items : [])
      } catch (e: any) {
        if (e?.name !== 'AbortError') setErr('Search failed. Try again.')
        setList([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => { clearTimeout(t); ctrl.abort() }
  }, [searchQ, mode])

  return (
    <div>
      <p className="text-sm text-gray-700">Search the name and address of your GP</p>

      <input
        className="mt-2 w-full border rounded-md p-2 disabled:opacity-60"
        placeholder="Start typing the GP practice name…"
        value={searchQ}
        disabled={mode === 'locked'}
        onChange={(e) => setSearchQ(e.target.value)}
      />

      {mode === 'locked' ? (
        <div className="mt-2 text-sm">
          <p className="font-medium text-gray-900">{initial?.name || searchQ}</p>
          {(initial?.address || initial?.nameAddress) && (
            <p className="text-gray-600 whitespace-pre-wrap leading-snug">
              {initial?.address || initial?.nameAddress}
            </p>
          )}
          {initial?.id && <p className="text-xs text-gray-500 mt-1">ODS: {initial.id}</p>}
          <button
            type="button"
            className="mt-1 underline text-emerald-700"
            onClick={() => { setMode('editing'); setList([]); setSearchQ('') }}
          >
            Change
          </button>
        </div>
      ) : searchQ.trim().length >= 2 ? (
        <p className="mt-2 text-sm">{loading ? 'Searching…' : list.length ? 'Do you mean any of these?' : 'No matches yet'}</p>
      ) : null}

      {err && <p className="mt-2 text-sm text-rose-700">{err}</p>}

      {mode === 'editing' && list.length > 0 && (
        <div className="mt-2 border rounded-md divide-y max-h-72 overflow-auto">
          {list.map((s) => {
            const line = `${s.name}${s.address ? ' – ' + s.address : ''}`
            return (
              <button
                key={s.id}
                type="button"
                className="w-full text-left p-3 hover:bg-gray-50"
                onClick={() => {
                  onPick(s)
                  setMode('locked')
                  setSearchQ(line)
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
  )
}
