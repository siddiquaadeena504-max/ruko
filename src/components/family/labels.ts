import type { AlertStatus, DeliveryStatus, RiskLevel } from "@/lib/types";

export const INDICATOR_LABELS: Record<string, string> = {
  impersonation: "Claimed to be CBI / police / official",
  digital_arrest: "Threatened arrest",
  aadhaar_parcel: "Aadhaar / drug parcel story",
  money_demand: "Asked for money",
  urgency: "Rushed / urgent pressure",
  video_call: "Forced video call",
  isolation: "Told to stay isolated",
  secrecy: "Told not to tell family",
  credentials: "Asked for OTP / PIN / bank details",
};

export const LEVEL_LABEL: Record<RiskLevel, { label: string; tone: "coral" | "lavender" | "neutral" }> = {
  high: { label: "Known scam pattern", tone: "coral" },
  possible: { label: "Possible scam", tone: "coral" },
  unclear: { label: "No clear pattern — not verified safe", tone: "neutral" },
};

export const STATUS_LABEL: Record<AlertStatus, { label: string; tone: "coral" | "sage" | "neutral" | "lavender" }> = {
  pending: { label: "Waiting for acknowledgement", tone: "coral" },
  acknowledged: { label: "Acknowledged", tone: "sage" },
  exhausted: { label: "No one responded", tone: "coral" },
  not_sent: { label: "Not sent", tone: "neutral" },
};

export const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  sent: "Sent to SMS provider",
  simulated: "Demo — not actually sent",
  failed: "Failed to send",
};

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function fullDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
