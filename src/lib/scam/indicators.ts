/**
 * Known digital-arrest / impersonation scam indicators.
 *
 * Each indicator has a weight, multilingual trigger phrases (matched against the spoken
 * transcript), and optionally a follow-up question. To add a pattern, add an entry here —
 * the engine, questions and reasons pick it up automatically.
 */

export type IndicatorId =
  | "impersonation"
  | "digital_arrest"
  | "aadhaar_parcel"
  | "money_demand"
  | "urgency"
  | "video_call"
  | "isolation"
  | "secrecy"
  | "credentials";

export interface Indicator {
  id: IndicatorId;
  weight: number;
  /** Whether this indicator can be asked about as a yes/no question. */
  askable: boolean;
  phrases: string[];
}

export const INDICATORS: Indicator[] = [
  {
    id: "impersonation",
    weight: 3,
    askable: true,
    phrases: [
      "cbi", "police", "policeman", "cyber cell", "cyber crime", "crime branch", "narcotics", "ncb", "customs",
      "enforcement directorate", "income tax", "rbi", "reserve bank", "trai", "telecom department", "supreme court",
      "high court", "judge", "officer", "inspector", "government", "afsar", "adhikari",
      "सीबीआई", "पुलिस", "अफसर", "अधिकारी", "इंस्पेक्टर", "कस्टम", "नारकोटिक्स", "क्राइम ब्रांच", "साइबर", "सरकारी",
      "சிபிஐ", "போலீஸ்", "காவல்", "அதிகாரி", "சைபர்",
      "సీబీఐ", "పోలీస్", "పోలీసు", "అధికారి", "సైబర్",
      "ಸಿಬಿಐ", "ಪೊಲೀಸ್", "ಅಧಿಕಾರಿ", "ಸೈಬರ್",
      "സിബിഐ", "പോലീസ്", "ഉദ്യോഗസ്ഥ", "സൈബർ",
      "সিবিআই", "পুলিশ", "অফিসার", "সাইবার",
    ],
  },
  {
    id: "digital_arrest",
    weight: 3,
    askable: true,
    phrases: [
      "digital arrest", "arrest", "warrant", "jail", "prison", "case filed", "fir", "money laundering", "illegal",
      "giraftar", "girftar",
      "गिरफ्तार", "गिरफ़्तार", "डिजिटल अरेस्ट", "अरेस्ट", "जेल", "वारंट", "केस",
      "கைது", "கைதில்", "ஜெயில்", "சிறை", "அரெஸ்ட்", "வாரண்ட்",
      "అరెస్ట్", "అరెస్టు", "జైలు", "వారెంట్",
      "ಬಂಧನ", "ಬಂಧಿಸ", "ಅರೆಸ್ಟ್", "ಜೈಲು",
      "അറസ്റ്റ്", "ജയിൽ", "വാറന്റ്",
      "গ্রেফতার", "গ্রেপ্তার", "অ্যারেস্ট", "জেল",
    ],
  },
  {
    id: "aadhaar_parcel",
    weight: 2.5,
    askable: false,
    phrases: [
      "aadhaar", "aadhar", "adhar", "parcel", "courier", "fedex", "dhl", "package", "drugs", "drug", "narcotic", "mdma",
      "आधार", "पार्सल", "कूरियर", "ड्रग्स", "ड्रग", "नशीले",
      "ஆதார்", "பார்சல்", "கூரியர்", "போதை",
      "ఆధార్", "పార్సిల్", "పార్సెల్", "డ్రగ్స్",
      "ಆಧಾರ್", "ಪಾರ್ಸೆಲ್", "ಡ್ರಗ್ಸ್",
      "ആധാർ", "പാഴ്സൽ", "പാർസൽ", "മയക്കുമരുന്ന്",
      "আধার", "পার্সেল", "ড্রাগ", "মাদক",
    ],
  },
  {
    id: "money_demand",
    weight: 3,
    askable: true,
    phrases: [
      "transfer", "pay", "payment", "money", "rupees", "lakh", "upi", "rtgs", "neft", "bank account", "safe account",
      "verification account", "deposit", "penalty", "refundable", "gpay", "phonepe", "paytm",
      "paisa", "paise", "rupaye", "paise bhejo",
      "पैसे", "पैसा", "रुपये", "रुपए", "ट्रांसफर", "जमा", "लाख", "खाते", "पैसे भेज",
      "பணம்", "ரூபாய்", "பணத்தை அனுப்ப", "டிரான்ஸ்பர்", "லட்சம்",
      "డబ్బు", "రూపాయ", "ట్రాన్స్‌ఫర్", "ట్రాన్స్ఫర్", "డబ్బు పంపండి", "లక్ష",
      "ಹಣ", "ದುಡ್ಡು", "ರೂಪಾಯಿ", "ವರ್ಗಾವಣೆ", "ಲಕ್ಷ",
      "പണം", "രൂപ", "ട്രാൻസ്ഫർ", "പണം അയക്ക", "ലക്ഷം",
      "টাকা", "ট্রান্সফার", "টাকা পাঠান", "লাখ",
    ],
  },
  {
    id: "urgency",
    weight: 1.5,
    askable: false,
    phrases: [
      "immediately", "right now", "within", "urgent", "today itself", "last warning", "otherwise", "hurry",
      "turant", "jaldi", "fauran",
      "तुरंत", "अभी के अभी", "जल्दी", "फौरन",
      "உடனே", "இப்போதே", "அவசரம்",
      "వెంటనే", "ఇప్పుడే",
      "ತಕ್ಷಣ", "ಈಗಲೇ",
      "ഉടനെ", "ഇപ്പോൾ തന്നെ",
      "এখনই", "তাড়াতাড়ি", "অবিলম্বে",
    ],
  },
  {
    id: "video_call",
    weight: 2.5,
    askable: true,
    phrases: [
      "video call", "video", "skype", "whatsapp call", "camera", "stay on the call", "don't cut", "dont cut",
      "don't disconnect", "do not disconnect", "keep the call",
      "वीडियो कॉल", "वीडियो", "कैमरा", "फ़ोन मत काट", "फोन मत काट",
      "வீடியோ கால்", "வீடியோ", "கேமரா",
      "వీడియో కాల్", "వీడియో", "కెమెరా",
      "ವಿಡಿಯೋ ಕಾಲ್", "ವಿಡಿಯೋ", "ವೀಡಿಯೊ", "ಕ್ಯಾಮೆರಾ",
      "വീഡിയോ കോൾ", "വീഡിയോ", "ക്യാമറ",
      "ভিডিও কল", "ভিডিও", "ক্যামেরা",
    ],
  },
  {
    id: "isolation",
    weight: 2,
    askable: false,
    phrases: [
      "stay in the room", "lock the door", "don't go out", "dont go out", "stay alone", "be alone", "don't leave", "close the door",
      "house arrest", "stay inside",
      "कमरे में", "अकेले", "बाहर मत", "दरवाज़ा बंद", "दरवाजा बंद",
      "தனியாக", "அறையில்", "வெளியே போக",
      "ఒంటరిగా", "గదిలో",
      "ಒಬ್ಬರೇ", "ಕೋಣೆಯಲ್ಲಿ",
      "ഒറ്റയ്ക്ക്", "മുറിയിൽ",
      "একা", "ঘরে থাকুন",
    ],
  },
  {
    id: "secrecy",
    weight: 3,
    askable: true,
    phrases: [
      "don't tell", "dont tell", "do not tell", "don't inform", "do not inform", "not to tell", "not tell anyone",
      "not tell", "not inform", "secret", "confidential", "tell no one", "keep it between us", "nobody should know",
      "kisi ko mat", "mat batana", "mat batao", "ghar walon",
      "किसी को मत", "किसी को नहीं", "मत बताना", "मत बताओ", "मत बताइए", "गुप्त", "घर वालों",
      "யாரிடமும் சொல்ல", "சொல்லக்கூடாது", "ரகசியம்",
      "ఎవరికీ చెప్పొద్దు", "ఎవరికీ చెప్పకండి", "రహస్యం",
      "ಯಾರಿಗೂ ಹೇಳಬೇಡಿ", "ರಹಸ್ಯ",
      "ആരോടും പറയരുത്", "രഹസ്യം",
      "কাউকে বলবেন না", "গোপন",
    ],
  },
  {
    id: "credentials",
    weight: 3,
    askable: true,
    phrases: [
      "otp", "pin", "password", "cvv", "card number", "bank details", "net banking", "anydesk", "teamviewer",
      "screen share", "download app", "install app",
      "ओटीपी", "पिन", "पासवर्ड",
      "ஓடிபி", "ஓ.டி.பி", "பின் நம்பர்",
      "ఓటీపీ", "పిన్",
      "ಒಟಿಪಿ", "ಓಟಿಪಿ", "ಪಿನ್",
      "ഒടിപി", "പിൻ",
      "ওটিপি", "পিন",
    ],
  },
];

export const INDICATOR_IDS: string[] = INDICATORS.map((i) => i.id);

/** Order in which follow-up questions are asked when the indicator wasn't already heard. */
export const QUESTION_PRIORITY: IndicatorId[] = [
  "impersonation",
  "money_demand",
  "video_call",
  "secrecy",
  "digital_arrest",
  "credentials",
];
