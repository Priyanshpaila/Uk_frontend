// app/private-services/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

// Disable cache while wiring templates
export const revalidate = 0;

// Types reflect current API with optional meta for background settings
type Page = {
  title: string;
  slug: string;
  content?: string;
  rendered_html?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta?: {
    background?: {
      enabled?: boolean | null;
      url?: string | null; // full URL or path consumable by Next Image
      blur?: number | null; // 0-24 mapped to Tailwind blur steps
      overlay?: number | null; // 0-80 percent darkness overlay
    } | null;
  } | null;
};

const PAGES_BASE =
  process.env.NEXT_PUBLIC_PAGES_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "";

async function fetchPage(slug: string): Promise<Page> {
  if (!PAGES_BASE) {
    throw new Error(
      "Missing NEXT_PUBLIC_PAGES_BASE (or NEXT_PUBLIC_API_BASE) env var"
    );
  }
  const res = await fetch(`${PAGES_BASE}/api/pages/slug/${slug}`, {
    cache: "no-store",
    // Important for SSR on separate domains
    next: { revalidate: 0 },
  });

  if (res.status === 404) notFound();
  if (!res.ok) {
    throw new Error(`Page fetch failed ${res.status}`);
  }
  return res.json();
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const page = await fetchPage(params.slug);
  return {
    title: page?.meta_title || page?.title || "",
    description: page?.meta_description || undefined,
  };
}

// Helper to map numeric blur to a safe Tailwind class
function blurClass(n: number): string {
  if (n <= 0) return "backdrop-blur-0";
  if (n <= 4) return "backdrop-blur-sm";
  if (n <= 8) return "backdrop-blur"; // default
  if (n <= 12) return "backdrop-blur-md";
  if (n <= 16) return "backdrop-blur-lg";
  if (n <= 20) return "backdrop-blur-xl";
  if (n <= 24) return "backdrop-blur-2xl";
  return "backdrop-blur-3xl";
}

function resolveMediaUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const origin =
    process.env.NEXT_PUBLIC_MEDIA_ORIGIN ||
    process.env.NEXT_PUBLIC_PAGES_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "";
  if (!origin) return path; // fallback to relative
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export default async function ServiceLanding({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const page = await fetchPage(params.slug);
  const html = page.rendered_html || page.content || "";

  const bgUrl = page?.meta?.background?.url || "";
  const resolvedBgUrl = resolveMediaUrl(bgUrl);
  const bgEnabled = (page?.meta?.background as any)?.enabled ?? true;
  const overlayPct = Math.max(
    0,
    Math.min(80, Number(page?.meta?.background?.overlay ?? 30))
  );
  const blur = Number(page?.meta?.background?.blur ?? 12);
  const blurCls = blurClass(blur);

  const showDebug = searchParams?.debug === '1';

  // If no background configured, fall back to the simple layout
  if (!bgUrl || !bgEnabled) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div
          className="prose prose-neutral max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {showDebug && (
          <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border bg-white/90 p-3 text-xs shadow-xl">
            <div className="font-semibold mb-1">BG Debug</div>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify({ slug: page.slug, bgEnabled, bgUrl, resolvedBgUrl, overlayPct, blur, hasHtml: Boolean(html) }, null, 2)}</pre>
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background image */}
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={resolvedBgUrl}
          alt=""
          fill
          priority={false}
          sizes="100vw"
          className="object-cover"
        />
        {/* Dark overlay from admin percentage */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlayPct / 100})` }}
        />
      </div>

      {/* Foreground glass card with blur */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        <div className={`rounded-2xl bg-white/70 ${blurCls} shadow-xl ring-1 ring-black/5`}>
          <article className="prose prose-neutral max-w-none p-6 md:p-10">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </article>
        </div>
      </div>
      {showDebug && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border bg-white/90 p-3 text-xs shadow-xl">
          <div className="font-semibold mb-1">BG Debug</div>
          <pre className="whitespace-pre-wrap break-all">
{JSON.stringify({ slug: page.slug, bgEnabled, bgUrl, resolvedBgUrl, overlayPct, blur, hasHtml: Boolean(html) }, null, 2)}
          </pre>
          <a href={resolvedBgUrl} target="_blank" rel="noreferrer" className="underline">Open image</a>
        </div>
      )}
    </div>
  );
}