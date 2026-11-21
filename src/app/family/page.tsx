"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { AuthView } from "@/components/family/AuthView";
import { Dashboard, type DashboardData } from "@/components/family/Dashboard";
import { Notice, Spinner } from "@/components/ui";

export default function FamilyPage() {
  const [state, setState] = useState<"loading" | "auth" | "ready" | "error">("loading");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (quiet = false) => {
    try {
      const d = await api<DashboardData>("/api/family");
      setData(d);
      setState("ready");
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setState("auth");
      else if (!quiet) {
        setError(e instanceof Error ? e.message : "Couldn't load the dashboard");
        setState("error");
      } else setError("Connection lost — showing the last update.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Live updates: poll while the dashboard is open and visible.
  useEffect(() => {
    if (state !== "ready") return;
    timer.current = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 8000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [state, load]);

  if (state === "loading") return <Spinner label="Loading family dashboard…" />;
  if (state === "auth") return <AuthView onDone={() => void load()} />;
  if (state === "error" || !data)
    return (
      <main className="mx-auto max-w-md p-6">
        <Notice tone="warn" title="Couldn't load the dashboard">
          {error}
          <button className="mt-2 block font-semibold text-lavender-deep underline" onClick={() => void load()}>
            Try again
          </button>
        </Notice>
      </main>
    );

  return (
    <Dashboard
      data={data}
      reload={() => load(true)}
      connectionError={error}
      onSignOut={async () => {
        await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        setData(null);
        setState("auth");
      }}
    />
  );
}
