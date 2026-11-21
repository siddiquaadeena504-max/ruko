import type { LanguageCode, PublicAlert, PublicContact } from "@/lib/types";

/**
 * The scripted demo: a caller claiming to be a CBI officer says the person's Aadhaar was used
 * in a drug parcel, threatens digital arrest, demands money, insists on a video call and says
 * not to tell family. The opening story mentions the first three; Ruko's follow-up questions
 * uncover the rest. Runs entirely in the browser — no API keys, no server, nothing sent.
 */
const STORIES: Partial<Record<LanguageCode, string>> = {
  en: "A man called me saying he is an officer from the CBI. He said my Aadhaar card was used to send a parcel with drugs, and that I am under digital arrest.",
  hi: "एक आदमी का फ़ोन आया, बोला वो CBI का अफसर है। उसने कहा मेरे आधार कार्ड से ड्रग्स वाला पार्सल भेजा गया है, और मैं डिजिटल अरेस्ट में हूँ।",
  ta: "ஒருவர் போன் செய்து தான் சிபிஐ அதிகாரி என்றார். என் ஆதார் கார்டு மூலம் போதைப் பொருள் பார்சல் அனுப்பப்பட்டது என்றும், நான் டிஜிட்டல் கைதில் இருக்கிறேன் என்றும் சொன்னார்.",
};

export function demoStory(lang: LanguageCode): { text: string; lang: LanguageCode } {
  const text = STORIES[lang];
  return text ? { text, lang } : { text: STORIES.en!, lang: "en" };
}

export const DEMO_CONTACTS: PublicContact[] = [
  { id: "demo-1", name: "Priya", phone: "+91 98000 00001", relation: "Daughter", priority: 1 },
  { id: "demo-2", name: "Arjun", phone: "+91 98000 00002", relation: "Son", priority: 2 },
];

/** Seconds before the demo "escalates" to the next contact, and before the demo acknowledgement. */
export const DEMO_ESCALATE_SEC = 8;
export const DEMO_ACK_SEC = 7;

export function demoAlert(indicatorIds: string[]): PublicAlert {
  const now = new Date().toISOString();
  return {
    id: "demo-alert",
    householdId: "demo",
    elderName: "You",
    createdAt: now,
    level: "high",
    indicatorIds,
    status: "pending",
    escalateAfterSec: DEMO_ESCALATE_SEC,
    nextEscalationAt: new Date(Date.now() + DEMO_ESCALATE_SEC * 1000).toISOString(),
    deliveries: [
      { contactId: "demo-1", contactName: "Priya", phoneMasked: "+91 ••••• 001", attemptedAt: now, status: "simulated", provider: "demo-mock" },
    ],
    providerLive: false,
  };
}

export function demoEscalate(a: PublicAlert): PublicAlert {
  return {
    ...a,
    nextEscalationAt: undefined,
    deliveries: [
      ...a.deliveries,
      { contactId: "demo-2", contactName: "Arjun", phoneMasked: "+91 ••••• 002", attemptedAt: new Date().toISOString(), status: "simulated", provider: "demo-mock" },
    ],
  };
}

export function demoAcknowledge(a: PublicAlert): PublicAlert {
  const last = a.deliveries[a.deliveries.length - 1];
  return { ...a, status: "acknowledged", acknowledgedAt: new Date().toISOString(), acknowledgedBy: last?.contactName ?? "Family" };
}
