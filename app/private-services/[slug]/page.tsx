// app/private-services/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import parse, {
  domToReact,
  Element as HtmlElement,
  type DOMNode,
  type HTMLReactParserOptions,
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
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL env var");
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

// Grab plain text from a node tree (used to detect empty strong/span wrappers)
function getNodeText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.data ?? "";
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(getNodeText).join("");
  }
  return "";
}

/* ------------ Styled HTML renderer (styles your content HTML) ------------ */

function RichContent({ html }: { html: string }) {
  if (!html) return null;

  const options: HTMLReactParserOptions = {
    replace(domNode) {
      if (domNode.type !== "tag") return;

      const el = domNode as HtmlElement;
      const classAttr = el.attribs?.class || "";
      const isCentered = classAttr.split(" ").includes("ql-align-center");

      /* ---------- Special-case: paragraphs that are a CTA button row ---------- */
      if (el.name === "p") {
        const children = el.children || [];

        const hasAnchor = children.some(
          (child) =>
            child.type === "tag" &&
            (child as HtmlElement).name === "a"
        );

        const isButtonRow =
          hasAnchor &&
          children.every((child) => {
            if (child.type === "text") {
              const text = (child as any).data ?? "";
              return !text.trim();
            }
            if (child.type === "tag") {
              const name = (child as HtmlElement).name;
              if (name === "a" || name === "br") return true;
              if (name === "strong" || name === "span") {
                const t = getNodeText(child);
                return !t.trim();
              }
            }
            return false;
          });

        // e.g. your "Start now / Reorder" line
        if (isButtonRow) {
          const anchors = children.filter(
            (child) =>
              child.type === "tag" &&
              (child as HtmlElement).name === "a"
          ) as HtmlElement[];

          return (
            <div className="my-6 flex flex-wrap justify-center gap-4">
              {anchors.map((a, idx) => {
                const href = a.attribs.href || "#";
                const target = a.attribs.target;
                const rel =
                  target === "_blank"
                    ? "noopener noreferrer"
                    : undefined;

                const label = domToReact(
                  (a.children || []) as unknown as DOMNode[],
                  options
                );

                return (
                  <a
                    key={idx}
                    href={href}
                    target={target}
                    rel={rel}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    {label}
                  </a>
                );
              })}
            </div>
          );
        }

        // Normal paragraph (centered if ql-align-center)
        const childrenReact = domToReact(
          (el.children || []) as unknown as DOMNode[],
          options
        );

        const hasNonBrTag = children.some(
          (child) =>
            child.type === "tag" &&
            (child as HtmlElement).name !== "br"
        );
        const textContent = children
          .map((c) => getNodeText(c))
          .join("");

        // Pure spacer paragraphs (just <br> / spaces) -> small vertical gap
        if (!hasNonBrTag && !textContent.trim()) {
          return <div className="h-4 md:h-6" />;
        }

        return (
          <p
            className={`mb-3 text-base leading-relaxed text-slate-700 ${
              isCentered ? "text-center" : ""
            }`}
          >
            {childrenReact}
          </p>
        );
      }

      // For everything else, render children then wrap in styled tag
      const childrenReact = domToReact(
        (el.children || []) as unknown as DOMNode[],
        options
      );

      switch (el.name) {
        case "h1":
          return (
            <h1 className="mb-4 mt-2 text-center text-3xl font-bold tracking-tight text-emerald-600 md:text-4xl">
              {childrenReact}
            </h1>
          );

        case "h2":
          return (
            <h2 className="mb-4 mt-8 text-center text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              {childrenReact}
            </h2>
          );

        case "h3":
          return (
            <h3 className="mt-8 mb-3 text-xl font-semibold text-slate-900">
              {childrenReact}
            </h3>
          );

        case "h4":
          return (
            <h4 className="mt-6 mb-3 text-lg font-semibold text-slate-900">
              {childrenReact}
            </h4>
          );

        case "strong":
          return (
            <strong className="font-semibold text-slate-900">
              {childrenReact}
            </strong>
          );

        case "em":
          return <em className="text-slate-800">{childrenReact}</em>;

        case "ul":
          return (
            <ul className="my-4 ml-6 list-disc space-y-1 text-slate-700">
              {childrenReact}
            </ul>
          );

        case "ol":
          return (
            <ol className="my-4 ml-6 list-decimal space-y-1 text-slate-700">
              {childrenReact}
            </ol>
          );

        case "li":
          return (
            <li className="leading-relaxed text-slate-700">
              {childrenReact}
            </li>
          );

        case "a": {
          // Inline links (inside normal text)
          const href = el.attribs.href || "#";
          const target = el.attribs.target;
          const rel =
            target === "_blank" ? "noopener noreferrer" : undefined;

          return (
            <a
              href={href}
              target={target}
              rel={rel}
              className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              {childrenReact}
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
              className="my-6 mx-auto max-h-80 w-auto max-w-full rounded-xl object-contain shadow-md"
            />
          );
        }

        case "br":
          return <br />;

        default:
          return; // let html-react-parser handle anything else
      }
    },
  };

  return <div>{parse(html, options)}</div>;
}

/* ------------ Page component ------------ */

export default async function ServiceLanding({
  params,
}: {
  params: ParamsPromise;
}) {
  const { slug } = await params;
  const page = await fetchPageBySlug(slug);

  const html = page.rendered_html || page.content || "";

  const bg = page.meta?.background;
  const bgUrl = bg?.url || null;
  const resolvedBgUrl = resolveMediaUrl(bgUrl);
  const bgEnabled = bg?.enabled ?? true;
  const overlayPct = Math.max(0, Math.min(80, Number(bg?.overlay ?? 30)));
  const blur = Number(bg?.blur ?? 12);
  const blurCls = blurClass(blur);

  // Simple layout if no background image configured
  if (!bgUrl || !bgEnabled) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* <header className="mb-8 text-left">
          <h1 className="mb-2 text-3xl font-semibold text-emerald-600 md:text-4xl">
            {page.title}
          </h1>
          {page.description && (
            <p className="max-w-2xl text-sm text-slate-700 md:text-base">
              {page.description}
            </p>
          )}
        </header> */}

        <section className="rounded-4xl bg-amber-50/95 p-6 shadow-xl ring-1 ring-black/5 md:p-10">
          <RichContent html={html} />
        </section>
      </main>
    );
  }

  // Layout with hero background image (like Travel Clinic reference)
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
        {/* <header className="mb-6 text-center text-white">
          <h1 className="mb-2 text-3xl font-semibold md:text-4xl">
            {page.title}
          </h1>
          {page.description && (
            <p className="mx-auto max-w-2xl text-sm text-white/80 md:text-base">
              {page.description}
            </p>
          )}
        </header> */}

        <div
          className={`rounded-4xl bg-amber-50/95 ${blurCls} p-6 shadow-2xl ring-1 ring-black/10 md:p-10`}
        >
          <RichContent html={html} />
        </div>
      </div>
    </div>
  );
}
