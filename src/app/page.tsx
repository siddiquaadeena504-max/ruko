"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Globe, PlayCircle, Settings, Users, WifiOff } from "lucide-react";
import { useHousehold } from "@/lib/client/household";
import { languageInfo } from "@/lib/i18n/languages";
import { LanguageGrid } from "@/components/LanguageGrid";
import { LogoMark } from "@/components/Logo";
import { Modal, Pill } from "@/components/ui";

export default function Home() {
  const { status, household, language, t, setLanguage } = useHousehold();
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    if (status === "none") router.replace("/welcome");
  }, [status, router]);

  if (status === "loading" || status === "none") {
    return (
      <main className="flex min-h-dvh items-center justify-center" aria-busy>
        <div className="animate-pulse">
          <LogoMark size={64} />
        </div>
      </main>
    );
  }

  const contacts = household?.contacts ?? [];
  const name = household?.elderName && household.elderName !== "Friend" ? household.elderName : null;

  return (
    <main id="main" className="grain mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-8 pt-5">
      <header className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2.5">
          <LogoMark size={40} />
          <span className="text-2xl font-extrabold tracking-tight">Ruko</span>
        </span>
        <Link
          href="/settings"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-navy shadow-card transition hover:bg-lavender-mist"
          aria-label={t("settings")}
        >
          <Settings className="h-7 w-7" />
        </Link>
      </header>

      <section className="mt-8 animate-rise text-center">
        <h1 className="text-[1.9rem] font-bold leading-tight sm:text-4xl">{name ? t("greetingName", { name }) : t("greeting")}</h1>
      </section>

      {/* The help button dominates the screen on purpose. */}
      <section className="relative flex flex-1 items-center justify-center py-8">
        <div className="relative flex aspect-square w-[min(78vw,340px)] items-center justify-center">
          <span className="absolute inset-0 animate-breathe rounded-full bg-lavender/50" aria-hidden />
          <span className="absolute inset-[-8%] animate-breathe-slow rounded-full bg-lavender/25" aria-hidden />
          <Link
            href="/help"
            className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-full bg-gradient-to-b from-[#9A90D2] to-lavender-deep px-6 text-center text-white shadow-glow transition duration-300 hover:scale-[1.02] active:scale-[0.97]"
            aria-describedby="help-sub"
          >
            <svg viewBox="0 0 24 24" className="mb-3 h-16 w-16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
            </svg>
            <span className="text-[1.75rem] font-extrabold leading-tight tracking-wide sm:text-3xl">{t("helpButton")}</span>
          </Link>
        </div>
      </section>

      <p id="help-sub" className="text-center text-xl text-navy-soft">
        {t("helpSub")}
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setLangOpen(true)}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-4 font-semibold text-navy shadow-card hover:bg-lavender-mist"
          aria-label={`Language: ${languageInfo(language).english}. Change language`}
        >
          <Globe className="h-5 w-5 text-lavender-deep" aria-hidden />
          {languageInfo(language).native}
        </button>
        {contacts.length > 0 ? (
          <Pill tone="sage" className="min-h-[48px] px-4 text-base">
            <Users className="h-5 w-5" aria-hidden />
            {t("contactsReady")} · {contacts.length}
          </Pill>
        ) : (
          <Link href="/settings#contacts">
            <Pill tone="coral" className="min-h-[48px] px-4 text-base">
              <Users className="h-5 w-5" aria-hidden />
              {t("noContacts")}
            </Pill>
          </Link>
        )}
        {status === "offline" && (
          <Pill className="min-h-[48px] px-4 text-base">
            <WifiOff className="h-5 w-5" aria-hidden /> Offline
          </Pill>
        )}
      </div>

      <Link href="/help?demo=1" className="mx-auto mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full px-4 text-base font-semibold text-lavender-deep hover:bg-lavender-soft">
        <PlayCircle className="h-5 w-5" aria-hidden />
        {t("tryDemo")}
      </Link>

      <Modal open={langOpen} onOpenChange={setLangOpen} title="Language / भाषा">
        <LanguageGrid
          value={language}
          onChange={async (l) => {
            setLangOpen(false);
            await setLanguage(l).catch(() => undefined);
          }}
        />
      </Modal>
    </main>
  );
}
