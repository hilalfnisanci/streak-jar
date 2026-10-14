export const DEMO_BOOKING_URL = "https://cal.com/streak-jar/demo";

export type DemoBookingSlot = "nav" | "hero" | "closing";

export function getDemoBookingUrl(slot: DemoBookingSlot) {
  const url = new URL(DEMO_BOOKING_URL);

  url.searchParams.set("utm_source", "streak-jar-landing");
  url.searchParams.set("utm_medium", "cta");
  url.searchParams.set("utm_content", slot);

  return url.toString();
}
