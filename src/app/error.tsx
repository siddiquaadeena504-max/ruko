"use client";

import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <LogoMark size={64} />
      <h1 className="mt-6 text-2xl font-bold">Something went wrong.</h1>
      <p className="mt-2 text-lg text-navy-soft">If you are on a frightening call right now: hang up, do not send money, and call your family or 1930.</p>
      <div className="mt-8 grid w-full gap-3">
        <a href="tel:1930" className="flex min-h-[64px] items-center justify-center rounded-xl2 bg-coral-dark text-xl font-bold text-white">
          CALL 1930
        </a>
        <button onClick={reset} className="min-h-[56px] rounded-2xl bg-white font-semibold shadow-card">
          Try again
        </button>
        <Link href="/" className="min-h-[48px] pt-3 font-semibold text-lavender-deep">
          Back to home
        </Link>
      </div>
    </main>
  );
}
