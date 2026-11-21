// Shared types used by both client and server.

export type LanguageCode = "en" | "hi" | "ta" | "te" | "kn" | "ml" | "bn";

export type RiskLevel = "high" | "possible" | "unclear";

export type AlertConsent = "ask" | "always" | "never";

export type AnswerValue = "yes" | "no" | "unsure";

export interface PublicContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  priority: number;
}

export interface PublicHousehold {
  id: string;
  elderName: string;
  language: LanguageCode;
  voice: { enabled: boolean; rate: "slow" | "normal" };
  alertConsent: AlertConsent;
  escalateAfterSec: number;
  contacts: PublicContact[];
  linkedFamilyCount: number;
  createdAt: string;
}

export type DeliveryStatus = "sent" | "simulated" | "failed";

export interface PublicDelivery {
  contactId: string;
  contactName: string;
  phoneMasked: string;
  attemptedAt: string;
  status: DeliveryStatus;
  provider: string;
  error?: string;
}

export type AlertStatus = "pending" | "acknowledged" | "exhausted" | "not_sent";

export interface PublicAlert {
  id: string;
  householdId: string;
  elderName: string;
  createdAt: string;
  level: RiskLevel;
  indicatorIds: string[];
  status: AlertStatus;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  escalateAfterSec: number;
  nextEscalationAt?: string;
  deliveries: PublicDelivery[];
  providerLive: boolean;
}

export interface PublicSession {
  id: string;
  householdId: string;
  startedAt: string;
  endedAt: string;
  language: LanguageCode;
  level: RiskLevel;
  indicatorIds: string[];
  alertId?: string;
}
