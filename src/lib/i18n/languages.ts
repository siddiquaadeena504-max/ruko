import type { LanguageCode } from "../types";

export interface LanguageInfo {
  code: LanguageCode;
  /** Name in its own script. */
  native: string;
  english: string;
  /** BCP-47 tag for speech recognition and synthesis. */
  speech: string;
  /** Words that mean yes / no / not sure in spoken answers (lowercase). */
  yes: string[];
  no: string[];
  unsure: string[];
}

export const LANGUAGES: LanguageInfo[] = [
  {
    code: "en", native: "English", english: "English", speech: "en-IN",
    yes: ["yes", "yeah", "yep", "yup", "correct", "right", "they did", "he did", "she did", "true", "haan", "ha"],
    no: ["no", "nope", "not", "didn't", "did not", "never", "nahi"],
    unsure: ["don't know", "dont know", "not sure", "maybe", "can't remember", "i forgot", "unsure"],
  },
  {
    code: "hi", native: "हिन्दी", english: "Hindi", speech: "hi-IN",
    yes: ["हाँ", "हां", "हा", "जी हाँ", "जी हां", "बिल्कुल", "सही", "haan", "han", "yes"],
    no: ["नहीं", "नही", "नहि", "ना", "बिल्कुल नहीं", "nahi", "nahin", "na", "no"],
    unsure: ["पता नहीं", "मालूम नहीं", "याद नहीं", "शायद", "pata nahi", "maloom nahi", "shayad"],
  },
  {
    code: "ta", native: "தமிழ்", english: "Tamil", speech: "ta-IN",
    yes: ["ஆம்", "ஆமா", "ஆமாம்", "ஆமாங்க", "சரி", "aama", "aamam", "ama", "yes"],
    no: ["இல்லை", "இல்ல", "இல்லைங்க", "illai", "illa", "no"],
    unsure: ["தெரியாது", "தெரியல", "நினைவில்லை", "theriyathu", "theriyala"],
  },
  {
    code: "te", native: "తెలుగు", english: "Telugu", speech: "te-IN",
    yes: ["అవును", "ఔను", "అవునండి", "సరే", "avunu", "yes"],
    no: ["లేదు", "కాదు", "లేదండి", "ledu", "kaadu", "no"],
    unsure: ["తెలియదు", "గుర్తు లేదు", "teliyadu"],
  },
  {
    code: "kn", native: "ಕನ್ನಡ", english: "Kannada", speech: "kn-IN",
    yes: ["ಹೌದು", "ಹೌದ್", "ಹೂಂ", "houdu", "howdu", "yes"],
    no: ["ಇಲ್ಲ", "ಇಲ್ಲಾ", "illa", "no"],
    unsure: ["ಗೊತ್ತಿಲ್ಲ", "ನೆನಪಿಲ್ಲ", "gottilla"],
  },
  {
    code: "ml", native: "മലയാളം", english: "Malayalam", speech: "ml-IN",
    yes: ["അതെ", "ഉവ്വ്", "ആണ്", "athe", "uvvu", "yes"],
    no: ["ഇല്ല", "അല്ല", "illa", "alla", "no"],
    unsure: ["അറിയില്ല", "ഓർമ്മയില്ല", "ariyilla"],
  },
  {
    code: "bn", native: "বাংলা", english: "Bengali", speech: "bn-IN",
    yes: ["হ্যাঁ", "হাঁ", "হ্যা", "ঠিক", "hya", "hyan", "yes"],
    no: ["না", "নাহ", "নেই", "na", "no"],
    unsure: ["জানি না", "মনে নেই", "jani na"],
  },
];

export const LANGUAGE_CODES: LanguageCode[] = LANGUAGES.map((l) => l.code);

export function languageInfo(code: LanguageCode): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
