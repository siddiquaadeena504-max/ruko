// Run with: npm test   (uses Node's built-in TypeScript type stripping)
import assert from "node:assert/strict";
import { assess, chooseQuestions, detectFromSpeech, interpretAnswer } from "../src/lib/scam/engine.ts";
import { LANGUAGES } from "../src/lib/i18n/languages.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}
const words = (code: string) => LANGUAGES.find((l) => l.code === code)!;

console.log("Ruko scam engine");

test("demo scenario (English) is high risk", () => {
  const heard = detectFromSpeech(
    "A man called saying he is a CBI officer. He said my Aadhaar was used in a drug parcel and I am under digital arrest. He wants me to transfer money and stay on video call and not tell my family.",
  );
  for (const id of ["impersonation", "aadhaar_parcel", "digital_arrest", "money_demand", "video_call", "secrecy"]) assert.ok(heard.includes(id as never), id);
  assert.equal(assess(heard, {}).level, "high");
});

test("Hindi transcript detects police + arrest + money", () => {
  const heard = detectFromSpeech("पुलिस वाले ने कहा आपको गिरफ्तार करेंगे, तुरंत पैसे भेजो");
  assert.ok(heard.includes("impersonation") && heard.includes("digital_arrest") && heard.includes("money_demand") && heard.includes("urgency"));
  assert.equal(assess(heard, {}).level, "high");
});

test("Tamil transcript detects CBI and parcel", () => {
  const heard = detectFromSpeech("சிபிஐ அதிகாரி என்று சொன்னார், உங்கள் ஆதார் பார்சலில் உள்ளது");
  assert.ok(heard.includes("impersonation") && heard.includes("aadhaar_parcel"));
});

test("Tamil demo story: 'parcel was sent' is not a money demand", () => {
  const heard = detectFromSpeech("ஒருவர் போன் செய்து தான் சிபிஐ அதிகாரி என்றார். என் ஆதார் கார்டு மூலம் போதைப் பொருள் பார்சல் அனுப்பப்பட்டது என்றும், நான் டிஜிட்டல் கைதில் இருக்கிறேன் என்றும் சொன்னார்.");
  assert.deepEqual([...heard].sort(), ["aadhaar_parcel", "digital_arrest", "impersonation"]);
  assert.deepEqual(chooseQuestions(heard), ["money_demand", "video_call", "secrecy"]);
});

test("no false positives on harmless phrases", () => {
  assert.deepEqual(detectFromSpeech("I am fine, I was just spinning wool and I know my neighbour"), []);
});

test("never returns a 'safe' level", () => {
  const a = assess([], { impersonation: "no", money_demand: "no", secrecy: "no" });
  assert.equal(a.level, "unclear");
});

test("answers raise risk: CBI + money = high", () => {
  assert.equal(assess([], { impersonation: "yes", money_demand: "yes" }).level, "high");
});

test("'not sure' counts as partial", () => {
  const a = assess([], { money_demand: "unsure", video_call: "unsure", secrecy: "unsure" });
  assert.equal(a.level, "possible");
});

test("chooses 2–3 questions about things not yet heard", () => {
  const q = chooseQuestions(["impersonation", "digital_arrest"]);
  assert.deepEqual(q, ["money_demand", "video_call", "secrecy"]);
  const all = chooseQuestions(["impersonation", "money_demand", "video_call", "secrecy", "digital_arrest", "credentials"]);
  assert.ok(all.length >= 2);
});

test("spoken yes/no in several languages", () => {
  assert.equal(interpretAnswer("Yes, he did", words("en")), "yes");
  assert.equal(interpretAnswer("no I don't think so", words("en")), "no");
  assert.equal(interpretAnswer("I don't know", words("en")), "unsure");
  assert.equal(interpretAnswer("हाँ जी", words("hi")), "yes");
  assert.equal(interpretAnswer("जी नहीं", words("hi")), "no");
  assert.equal(interpretAnswer("पता नहीं", words("hi")), "unsure");
  assert.equal(interpretAnswer("ஆமாங்க", words("ta")), "yes");
  assert.equal(interpretAnswer("இல்லை", words("ta")), "no");
  assert.equal(interpretAnswer("అవును", words("te")), "yes");
  assert.equal(interpretAnswer("ಇಲ್ಲ", words("kn")), "no");
  assert.equal(interpretAnswer("അതെ", words("ml")), "yes");
  assert.equal(interpretAnswer("জানি না", words("bn")), "unsure");
  assert.equal(interpretAnswer("hmm", words("en")), null);
});

console.log(`\n${passed} passed`);
