import { cx } from "./ui";

const BARS = [0.45, 0.7, 1, 0.8, 0.55, 0.9, 0.65, 1, 0.5, 0.75, 0.6];

/** Calm microphone waveform. Animates gently while listening, rests as a flat line otherwise. */
export function Waveform({ active, className }: { active: boolean; className?: string }) {
  return (
    <div className={cx("flex h-16 items-center justify-center gap-1.5", className)} aria-hidden>
      {BARS.map((h, i) => (
        <span
          key={i}
          className={cx("w-2 origin-center rounded-full transition-all duration-500", active ? "animate-wave bg-lavender-deep" : "bg-lavender/40")}
          style={{
            height: active ? `${h * 100}%` : "14%",
            animationDelay: `${(i % 5) * 0.12 + (i > 5 ? 0.3 : 0)}s`,
            animationDuration: `${1 + (i % 3) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}
