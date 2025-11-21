// app/private-services/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import parse, {
  domToReact,
  type HTMLReactParserOptions,
  type Element,
  type DOMNode,
} from "html-react-parser";

export const revalidate = 0;

type Page = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  template?: string;
  visibility?: string;
  active?: boolean;
  meta_title?: string;
  meta_description?: string;
  meta?: {
    background?: {
      enabled?: boolean;
      background_upload?: string;
      url?: string | null;
      blur?: number | null;
      overlay?: number | null;
    } | null;
  } | null;
  status?: string;
  content?: string;
  rendered_html?: string;
  gallery?: string[];
  service_id?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

/* ------------ Fetch by slug: /api/pages/slug/:slug ------------ */

async function fetchPageBySlug(slug: string): Promise<Page> {
  if (!API_BASE) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE env var");
  }

  const res = await fetch(
    `${API_BASE}/pages/slug/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
      next: { revalidate: 0 },
    }
  );

  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    throw new Error(`Page fetch failed ${res.status}`);
  }

  return res.json();
}

/* ------------ Next.js 15: params is a Promise ------------ */

type ParamsPromise = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: ParamsPromise;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPageBySlug(slug);

  return {
    title: page?.meta_title || page?.title || "",
    description: page?.meta_description || page?.description || undefined,
  };
}

/* ------------ Helpers ------------ */

function blurClass(n: number): string {
  if (n <= 0) return "backdrop-blur-0";
  if (n <= 4) return "backdrop-blur-sm";
  if (n <= 8) return "backdrop-blur";
  if (n <= 12) return "backdrop-blur-md";
  if (n <= 16) return "backdrop-blur-lg";
  if (n <= 20) return "backdrop-blur-xl";
  if (n <= 24) return "backdrop-blur-2xl";
  return "backdrop-blur-3xl";
}

function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const origin =
    process.env.NEXT_PUBLIC_MEDIA_ORIGIN ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "";

  if (!origin) return path;

  return `${origin.replace(/\/$/, "")}${
    path.startsWith("/") ? path : `/${path}`
  }`;
}

/* ------------ Styled HTML renderer (for dangerous HTML) ------------ */

function RichContent({ html }: { html: string }) {
  if (!html) return null;

  const options: HTMLReactParserOptions = {
    replace(domNode) {
      if (domNode.type !== "tag") return;

      const el = domNode as Element;
      const children = domToReact(
        (el.children || []) as unknown as DOMNode[],
        options
      );

      switch (el.name) {
        case "h1":
          return (
            <h1 className="mb-4 mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              {children}
            </h1>
          );

        case "h2":
          return (
            <h2 className="mb-4 mt-8 text-center text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              {children}
            </h2>
          );

        case "h3":
          return (
            <h3 className="mt-8 mb-3 text-xl font-semibold text-slate-900">
              {children}
            </h3>
          );

        case "h4":
          return (
            <h4 className="mt-6 mb-3 text-lg font-semibold text-slate-900">
              {children}
            </h4>
          );

        case "p":
          return (
            <p className="mb-3 text-base leading-relaxed text-slate-700">
              {children}
            </p>
          );

        case "strong":
          return (
            <strong className="font-semibold text-slate-900">
              {children}
            </strong>
          );

        case "em":
          return <em className="text-slate-800">{children}</em>;

        case "ul":
          return (
            <ul className="my-4 ml-6 list-disc space-y-1 text-slate-700">
              {children}
            </ul>
          );

        case "ol":
          return (
            <ol className="my-4 ml-6 list-decimal space-y-1 text-slate-700">
              {children}
            </ol>
          );

        case "li":
          return (
            <li className="leading-relaxed text-slate-700">
              {children}
            </li>
          );

        case "a": {
          const href = el.attribs.href || "#";
          const target = el.attribs.target;
          const rel =
            target === "_blank" ? "noopener noreferrer" : undefined;

          // Button-like CTA styling
          return (
            <a
              href={href}
              target={target}
              rel={rel}
              className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {children}
            </a>
          );
        }

        case "img": {
          const src = el.attribs.src || "";
          const alt = el.attribs.alt || "";
          return (
            <img
              src={src}
              alt={alt}
              className="my-8 mx-auto max-h-72 w-auto max-w-full object-contain"
            />
          );
        }

        case "br":
          return <br />;

        default:
          return;
      }
    },
  };

  return <div>{parse(html, options)}</div>;
}

/* ------------ Page component ------------ */

export default async function ServiceLanding(props: {
  params: ParamsPromise;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { slug } = await props.params;
  const page = await fetchPageBySlug(slug);

  const html = page.rendered_html || page.content || "";

  const bg = page.meta?.background;
  const bgUrl = bg?.url || null;
  const resolvedBgUrl = resolveMediaUrl(bgUrl);
  const bgEnabled = bg?.enabled ?? true;
  const overlayPct = Math.max(0, Math.min(80, Number(bg?.overlay ?? 30)));
  const blur = Number(bg?.blur ?? 12);
  const blurCls = blurClass(blur);

  const showDebug = props.searchParams?.debug === "1";

  // Simple layout if no background
  if (!bgUrl || !bgEnabled) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-semibold text-slate-900 md:text-4xl">
            {page.title}
          </h1>
          {page.description && (
            <p className="mx-auto max-w-2xl text-sm text-slate-600 md:text-base">
              {page.description}
            </p>
          )}
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 md:p-12">
          <RichContent html={html} />
        </section>

        {showDebug && (
          <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border bg-white/90 p-3 text-xs shadow-xl">
            <div className="mb-1 font-semibold">BG Debug</div>
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(
                {
                  pageId: page._id,
                  slug: page.slug,
                  bgEnabled,
                  bgUrl,
                  resolvedBgUrl,
                  overlayPct,
                  blur,
                  hasHtml: Boolean(html),
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </main>
    );
  }

  // Fancy layout with background
  return (
    <div className="relative min-h-screen bg-black">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={resolvedBgUrl}
          alt={page.title || ""}
          fill
          priority={false}
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlayPct / 100})` }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        <header className="mb-6 text-center text-white">
          <h1 className="mb-2 text-3xl font-semibold md:text-4xl">
            {page.title}
          </h1>
          {page.description && (
            <p className="mx-auto max-w-2xl text-sm text-white/80 md:text-base">
              {page.description}
            </p>
          )}
        </header>

        <div
          className={`rounded-3xl bg-white/80 ${blurCls} p-6 shadow-xl ring-1 ring-black/10 md:p-12`}
        >
          <RichContent html={html} />
        </div>
      </div>

      {showDebug && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border bg-white/90 p-3 text-xs shadow-xl">
          <div className="mb-1 font-semibold">BG Debug</div>
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(
              {
                pageId: page._id,
                slug: page.slug,
                bgEnabled,
                bgUrl,
                resolvedBgUrl,
                overlayPct,
                blur,
                hasHtml: Boolean(html),
              },
              null,
              2
            )}
          </pre>
          {resolvedBgUrl && (
            <a
              href={resolvedBgUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Open image
            </a>
          )}
        </div>
      )}
    </div>
  );
}
