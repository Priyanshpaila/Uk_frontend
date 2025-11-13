import { Suspense } from 'react'
import ClientReorderAssessment from './ClientReorderAssessment'
import RequireAuth from '@/components/RequireAuth'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Record<string, string | string[] | undefined> }

export default function Page({ searchParams }: Props) {
  return (
    <RequireAuth>
      <Suspense fallback={<div>Loading reorder assessment…</div>}>
        <ClientReorderAssessment initialSearch={searchParams} />
      </Suspense>
    </RequireAuth>
  )
}