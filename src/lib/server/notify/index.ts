import "server-only";
import { MockProvider } from "./mock";
import { TwilioProvider } from "./twilio";
import type { NotificationProvider } from "./types";

let provider: NotificationProvider | null = null;

/** Picks the live provider when credentials exist, otherwise the clearly-labelled mock. */
export function getNotificationProvider(): NotificationProvider {
  if (provider) return provider;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  provider =
    TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER
      ? new TwilioProvider(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)
      : new MockProvider();
  return provider;
}

export type { NotificationProvider, SendResult } from "./types";
