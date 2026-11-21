import type { NotificationProvider, SendResult } from "./types";

/**
 * Mock provider used when no SMS credentials are configured.
 * It never claims delivery: every result is "simulated", and the UI labels it as not sent.
 */
export class MockProvider implements NotificationProvider {
  readonly name = "demo-mock";
  readonly isLive = false;
  async send(): Promise<SendResult> {
    return { status: "simulated" };
  }
}
