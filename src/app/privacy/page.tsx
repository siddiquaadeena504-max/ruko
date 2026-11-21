import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Privacy — Ruko" };

const SECTIONS: [string, string[]][] = [
  [
    "What Ruko listens to",
    [
      "Ruko uses your microphone only after you press the help button, and stops when the help session ends.",
      "Ruko never records phone calls, never listens in the background, and cannot hear the caller.",
      "Speech is turned into text by your browser's speech service. On some browsers (such as Chrome) this audio is processed by the browser maker's servers. Ruko itself does not receive or store audio.",
    ],
  ],
  [
    "What Ruko stores",
    [
      "Your chosen name, language and preferences.",
      "Your trusted contacts' names and phone numbers — encrypted with AES-256-GCM.",
      "The outcome of each help session: the date, the risk level, and which warning signs were found (for example “money demand”). Not your words.",
      "Alerts and whether a family member acknowledged them.",
      "For family dashboard accounts: name and email (encrypted) and a securely hashed password.",
    ],
  ],
  [
    "What Ruko never does",
    [
      "Never asks for your Aadhaar number, OTP, PIN, passwords or bank details, and never stores them.",
      "Never talks to the caller, and never controls your phone.",
      "Never sends an alert without your consent setting allowing it.",
      "Never claims a message was delivered when it wasn't. In demo mode, alerts are clearly marked as not sent.",
      "Never guarantees a call is safe. Ruko only recognises known scam patterns.",
    ],
  ],
  [
    "Alerts to family",
    [
      "When you agree, Ruko sends your trusted contacts a short text: that a possible scam was detected and they should call you on a number they already know.",
      "If the first contact doesn't respond, Ruko tells the next contact.",
    ],
  ],
  [
    "Deleting your data",
    ["Open Settings → Privacy & data → Delete all my data. Everything linked to your device is permanently removed."],
  ],
  [
    "Getting help",
    ["For money lost to cyber fraud, call the National Cyber Crime Helpline 1930 or report at cybercrime.gov.in."],
  ],
];

export default function Privacy() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 pb-16 pt-4">
      <Link href="/settings" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl font-semibold text-navy-soft hover:text-navy">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Back
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Privacy policy</h1>
      <p className="mt-2 text-lg text-navy-soft">Plain language, no small print. Ruko collects as little as possible.</p>
      {SECTIONS.map(([title, items]) => (
        <section key={title} className="card mt-5 p-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <ul className="mt-3 space-y-2.5 text-base text-navy-soft">
            {items.map((i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lavender-deep" aria-hidden />
                {i}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
