"use client";

import { Check } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n/languages";
import type { LanguageCode } from "@/lib/types";
import { cx } from "./ui";

export function LanguageGrid({ value, onChange }: { value: LanguageCode; onChange: (l: LanguageCode) => void }) {
  return (
    <div role="radiogroup" aria-label="Language" className="grid grid-cols-2 gap-3">
      {LANGUAGES.map((l) => {
        const selected = l.code === value;
        return (
          <button
            key={l.code}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(l.code)}
            className={cx(
              "flex min-h-[68px] items-center justify-between rounded-2xl border-2 px-4 text-left text-xl font-semibold transition",
              selected ? "border-lavender-deep bg-lavender-soft" : "border-line bg-white hover:border-lavender/60",
            )}
          >
            <span lang={l.code}>
              {l.native}
              <span className="block text-sm font-normal text-navy-soft" lang="en">
                {l.english}
              </span>
            </span>
            {selected && <Check className="h-6 w-6 shrink-0 text-lavender-deep" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
