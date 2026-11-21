import type { DeliveryStatus } from "@/lib/types";

export interface SendResult {
  status: DeliveryStatus; // "sent" = accepted by provider, "simulated" = mock, "failed" = error
  providerMessageId?: string;
  error?: string;
}

export interface NotificationProvider {
  /** Short name shown in the UI, e.g. "twilio-sms" or "demo-mock". */
  readonly name: string;
  /** True only when a real message can leave this server. */
  readonly isLive: boolean;
  send(to: string, body: string): Promise<SendResult>;
}
