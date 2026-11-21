"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, getDeviceToken, setDeviceToken } from "./api";
import { translator } from "@/lib/i18n/strings";
import type { LanguageCode, PublicHousehold } from "@/lib/types";

const LANG_KEY = "ruko.language";
const CACHE_KEY = "ruko.household";

type Status = "loading" | "ready" | "none" | "offline";

interface Ctx {
  status: Status;
  household: PublicHousehold | null;
  language: LanguageCode;
  t: ReturnType<typeof translator>;
  setLanguage: (l: LanguageCode) => Promise<void>;
  refresh: () => Promise<void>;
  setHousehold: (h: PublicHousehold | null) => void;
  signOutDevice: () => void;
}

const HouseholdContext = createContext<Ctx | null>(null);

function readCache(): PublicHousehold | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PublicHousehold) : null;
  } catch {
    return null;
  }
}

function writeCache(h: PublicHousehold | null) {
  try {
    if (h) localStorage.setItem(CACHE_KEY, JSON.stringify(h));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Holds the elder device's household (contacts, language, preferences).
 * A cached copy is kept locally so the help button and family numbers still work offline.
 */
export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [household, setHouseholdState] = useState<PublicHousehold | null>(null);
  const [language, setLang] = useState<LanguageCode>("en");

  const setHousehold = useCallback((h: PublicHousehold | null) => {
    setHouseholdState(h);
    writeCache(h);
    if (h) {
      setStatus((s) => (s === "offline" ? s : "ready"));
      setLang(h.language);
      try {
        localStorage.setItem(LANG_KEY, h.language);
      } catch {}
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!getDeviceToken()) {
      setStatus("none");
      return;
    }
    try {
      const { household } = await api<{ household: PublicHousehold }>("/api/household");
      setHousehold(household);
      setStatus("ready");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setDeviceToken(null);
        setHousehold(null);
        setStatus("none");
      } else {
        const cached = readCache();
        if (cached) {
          setHouseholdState(cached);
          setLang(cached.language);
          setStatus("offline");
        } else setStatus("none");
      }
    }
  }, [setHousehold]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as LanguageCode | null;
      if (saved) setLang(saved);
    } catch {}
    const cached = readCache();
    if (cached && getDeviceToken()) setHouseholdState(cached);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    async (l: LanguageCode) => {
      setLang(l);
      try {
        localStorage.setItem(LANG_KEY, l);
      } catch {}
      if (getDeviceToken()) {
        const { household } = await api<{ household: PublicHousehold }>("/api/household", { method: "PATCH", body: { language: l } });
        setHousehold(household);
      }
    },
    [setHousehold],
  );

  const signOutDevice = useCallback(() => {
    setDeviceToken(null);
    setHousehold(null);
    setStatus("none");
  }, [setHousehold]);

  const value = useMemo<Ctx>(
    () => ({ status, household, language, t: translator(language), setLanguage, refresh, setHousehold, signOutDevice }),
    [status, household, language, setLanguage, refresh, setHousehold, signOutDevice],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): Ctx {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used inside HouseholdProvider");
  return ctx;
}
