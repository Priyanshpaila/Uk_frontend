'use client'

type Props = {
  label?: string
  answered: number
  total: number
}

export default function AllStepsProgressPill({ label = 'Assessment progress', answered, total }: Props) {
  const safeTotal = Math.max(1, total)
  const pct = Math.round((answered / safeTotal) * 100)
  const left = Math.max(0, total - answered)

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-gray-800">{label}</span>
        <span className="text-gray-600">{answered} of {total} answered • {left} left</span>
      </div>
      <div className="w-full h-3 rounded-full bg-gray-200">
        <div
          className="h-3 rounded-full bg-emerald-600 transition-all"
          style={{ width: `${pct}%` }}
          aria-label={`${pct}%`}
        />
      </div>
    </div>
  )
}
