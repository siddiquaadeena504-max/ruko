export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill="#8D82C8" />
      <path d="M32 13c-11 0-19.5 7.8-19.5 17.5 0 5.3 2.6 10 6.7 13.2L17.5 52l9-4.6c1.8.4 3.6.6 5.5.6 11 0 19.5-7.8 19.5-17.5S43 13 32 13z" fill="#FAF8F3" />
      <rect x="25" y="23" width="5" height="15" rx="2.5" fill="#564A96" />
      <rect x="34" y="23" width="5" height="15" rx="2.5" fill="#564A96" />
    </svg>
  );
}

export function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {withText && <span className="text-2xl font-extrabold tracking-tight text-navy">Ruko</span>}
    </span>
  );
}
