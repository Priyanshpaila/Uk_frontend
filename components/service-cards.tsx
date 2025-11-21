"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

type ApiService = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  booking_flow?: string;
  reorder_flow?: string;
  forms_assignment?: string;
  status?: string;
  active?: boolean;
  view_type?: string;
  cta_text?: string;
};

type ApiResponse = {
  data: ApiService[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const API_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/services`;

const BG_GRADIENTS = [
  "from-cyan-400/90 to-sky-500/90",
  "from-pink-400/90 to-rose-500/90",
  "from-emerald-400/90 to-teal-500/90",
  "from-indigo-400/90 to-blue-500/90",
  "from-amber-400/90 to-orange-500/90",
  "from-violet-400/90 to-purple-500/90",
  "from-lime-400/90 to-green-500/90",
  "from-sky-400/90 to-blue-500/90",
];

export function ServiceCards() {
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(API_URL);
        if (!res.ok) {
          throw new Error(`Failed to fetch services (status: ${res.status})`);
        }

        const json: ApiResponse = await res.json();
        console.log("Fetched services:", json);
        setServices(json.data || []);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message || "Something went wrong while fetching services"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const getGradient = (index: number) =>
    BG_GRADIENTS[index % BG_GRADIENTS.length];

  const resolveImageUrl = (image?: string) => {
    if (!image) return null;
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }
    return `http://localhost:8000${image}`;
  };

  return (
    <section className="py-12 sm:py-16 bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4 text-balance">
            Your trusted online pharmacy for fast, expert care
          </h2>
          <p className="text-xl text-gray-600">
            How can we help with your health today?
          </p>
        </div>

        {loading && (
          <div className="text-center text-gray-500 py-8">
            Loading services...
          </div>
        )}

        {error && !loading && (
          <div className="text-center text-red-500 py-8">{error}</div>
        )}

        {!loading && !error && services.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No services found.
          </div>
        )}

        {!loading && !error && services.length > 0 && (
          <div
            className="sticky-stack flex flex-col gap-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-6"
            style={
              {
                ["--stack-top" as any]: "128px",
                ["--overlap" as any]: "12px",
              } as React.CSSProperties
            }
          >
            {services.map((service, index) => {
              const imageUrl = resolveImageUrl(service.image);
              const gradient = getGradient(index);

              return (
                <Card
                  key={service._id ?? index}
                  className="sticky-card group relative flex h-full flex-col items-stretch overflow-hidden rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-blue-200"
                  style={
                    {
                      ["--stack-i" as any]: index,
                    } as React.CSSProperties
                  }
                >
                  {/* Soft glow background */}
                  <div className="pointer-events-none absolute inset-x-6 top-8 h-24 rounded-full bg-blue-100/40 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Icon */}
                  <div className="mx-auto mb-4">
                    <div
                      className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md ring-2 ring-white/80 overflow-hidden`}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={service.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold">
                          {service.name?.charAt(0)?.toUpperCase() || "S"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="mb-3 text-sm font-semibold text-gray-900 text-center leading-snug line-clamp-2">
                    {service.name}
                  </h3>

                  {/* Button pinned at bottom */}
                  <div className="mt-auto pt-2">
                    <Link href={`/private-services/${service.slug}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center rounded-xl border-blue-600/80 bg-blue-50/40 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-800"
                      >
                        {service.cta_text || "Learn More"}
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
