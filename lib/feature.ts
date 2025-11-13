// lib/feature.ts
export function isBookingEnabled() {
  return process.env.NEXT_PUBLIC_BOOKING_ENABLED === 'true';
}
