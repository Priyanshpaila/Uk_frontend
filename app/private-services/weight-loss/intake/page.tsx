import { Suspense, use } from 'react';
import ClientIntake from './ClientIntake';

export const dynamic = 'force-dynamic';

type SearchDict = Record<string, string | string[] | undefined>;

export default function Page({
  searchParams,
}: {
  searchParams: Promise<SearchDict>; // <- promise now
}) {
  const sp = use(searchParams);      // <- unwrap the promise

  return (
    <Suspense fallback={<div>Loading intake form...</div>}>
      <ClientIntake initialSearch={sp} />
    </Suspense>
  );
}