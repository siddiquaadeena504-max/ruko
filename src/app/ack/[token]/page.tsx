"use client";

import Link from "next/link";
import { use, useState } from "react";
import { CheckCircle2, PhoneCall, ShieldAlert } from "lucide-react";
import { api } from "@/lib/client/api";
import { Logo } from "@/components/Logo";
import { Button, Card, Notice } from "@/components/ui";

/** Landing page for the link inside the SMS alert. Lets a family member acknowledge without an account. */
export default function AckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [elderName, setElderName] = useState("");
  const [error, setError] = useState("");

  async function ack() {
    setState("busy");
    try {
      const res = await api<{ elderName: string }>("/api/ack", { body: { token: decodeURIComponent(token) } });
      setElderName(res.elderName);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-6">
      <Logo />
      <Card className="mt-8 p-6">
        <div className="flex items-start gap-4">
          <ShieldAlert className="h-9 w-9 shrink-0 text-coral-dark" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold">Ruko alert</h1>
            <p className="mt-1 text-lg text-navy-soft">A possible digital arrest scam was detected during a help session with your family member.</p>
          </div>
        </div>
        <ul className="mt-5 space-y-2 text-base">
          <li>• Call them now on a number you already have saved — not a number from the caller.</li>
          <li>• Reassure them: real police never arrest anyone on a video call, and never ask for money.</li>
          <li>• If money was sent, call 1930 immediately or report at cybercrime.gov.in.</li>
        </ul>
      </Card>

      <div className="mt-6 space-y-3">
        {state === "done" ? (
          <Notice tone="ok" title="Thank you — marked as seen">
            Ruko will stop alerting other contacts{elderName ? ` about ${elderName}` : ""}. Please call them now.
          </Notice>
        ) : (
          <Button size="xl" className="w-full" icon={<CheckCircle2 className="h-6 w-6" />} loading={state === "busy"} onClick={ack}>
            I’ve seen this — I’ll call them
          </Button>
        )}
        {state === "error" && <Notice tone="warn">{error}</Notice>}
        <a href="tel:1930" className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-white font-semibold shadow-card">
          <PhoneCall className="h-5 w-5 text-coral-dark" aria-hidden /> Call 1930 (Cyber Crime Helpline)
        </a>
        <Link href="/family" className="block pt-2 text-center font-semibold text-lavender-deep">
          Open the family dashboard
        </Link>
      </div>
    </main>
  );
}
