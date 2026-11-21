import type { NotificationProvider, SendResult } from "./types";

/** Sends SMS via Twilio's REST API. "sent" means Twilio accepted it, not that the phone received it. */
export class TwilioProvider implements NotificationProvider {
  readonly name = "twilio-sms";
  readonly isLive = true;
  constructor(private sid: string, private token: string, private from: string) {}

  async send(to: string, body: string): Promise<SendResult> {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.sid)}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${this.sid}:${this.token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: this.from, Body: body }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
      if (!res.ok) return { status: "failed", error: data.message ?? `HTTP ${res.status}` };
      return { status: "sent", providerMessageId: data.sid };
    } catch (e) {
      return { status: "failed", error: e instanceof Error ? e.message : "Network error" };
    }
  }
}
