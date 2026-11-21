"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HelpSession } from "@/components/help/HelpSession";
import { useHousehold } from "@/lib/client/household";
import { LogoMark } from "@/components/Logo";

function HelpInner() {
  const params = useSearchParams();
  const { status } = useHousehold();
  if (status === "loading") return <Splash />;
  return <HelpSession demo={params.get("demo") === "1"} />;
}

function Splash() {
  return (
    <main className="flex min-h-dvh items-center justify-center" aria-busy>
      <div className="animate-pulse">
        <LogoMark size={64} />
      </div>
    </main>
  );
}

export default function HelpPage() {
  return (
    <Suspense fallback={<Splash />}>
      <HelpInner />
    </Suspense>
  );
}
