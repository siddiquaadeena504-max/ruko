"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import * as Switch from "@radix-ui/react-switch";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "sage" | "coral" | "ghost" | "danger";
type Size = "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-lavender-deep text-white hover:bg-lavender-dark shadow-lift",
  secondary: "bg-white text-navy border-2 border-line hover:border-lavender/60 hover:bg-lavender-mist",
  sage: "bg-sage text-sage-deep hover:bg-[#cfe1d2]",
  coral: "bg-coral-dark text-white hover:bg-[#9e4630] shadow-lift",
  ghost: "bg-transparent text-navy-soft hover:bg-navy/5",
  danger: "bg-white text-coral-dark border-2 border-coral/60 hover:bg-coral-soft",
};
const sizes: Record<Size, string> = {
  md: "min-h-[48px] px-5 text-base rounded-2xl",
  lg: "min-h-[60px] px-6 text-lg rounded-[20px]",
  xl: "min-h-[76px] px-7 text-xl rounded-xl2 font-bold tracking-wide",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }
>(function Button({ variant = "primary", size = "lg", loading, icon, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2.5 font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

/** Anchor styled as a button — used for tel: links so the phone's own dialer handles the call. */
export function LinkButton({
  href,
  variant = "primary",
  size = "lg",
  className,
  children,
  icon,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; icon?: ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2.5 font-semibold transition duration-200 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </a>
  );
}

export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" }) {
  return <As className={cx("card", className)}>{children}</As>;
}

export function Pill({ tone = "neutral", children, className }: { tone?: "neutral" | "sage" | "coral" | "lavender"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-navy/5 text-navy-soft",
    sage: "bg-sage text-sage-deep",
    coral: "bg-coral-soft text-coral-dark",
    lavender: "bg-lavender-soft text-lavender-deep",
  };
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", tones[tone], className)}>{children}</span>;
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warn" | "ok"; title?: string; children?: ReactNode; className?: string }) {
  const map = {
    info: { cls: "bg-lavender-mist border-lavender/30 text-navy", Icon: Info, ic: "text-lavender-deep" },
    warn: { cls: "bg-coral-soft border-coral/50 text-navy", Icon: AlertTriangle, ic: "text-coral-dark" },
    ok: { cls: "bg-sage/70 border-sage-dark/20 text-navy", Icon: CheckCircle2, ic: "text-sage-deep" },
  }[tone];
  return (
    <div role={tone === "warn" ? "alert" : "status"} className={cx("flex gap-3 rounded-2xl border p-4", map.cls, className)}>
      <map.Icon className={cx("mt-0.5 h-5 w-5 shrink-0", map.ic)} aria-hidden />
      <div className="min-w-0 text-base">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-navy-soft" : ""}>{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-navy-soft">
      <Loader2 className="h-6 w-6 animate-spin text-lavender" aria-hidden />
      <span>{label ?? "Loading…"}</span>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = `t-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-base text-navy-soft">{description}</span>}
      </label>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="relative h-8 w-14 shrink-0 rounded-full bg-navy/15 transition data-[state=checked]:bg-lavender-deep disabled:opacity-50"
      >
        <Switch.Thumb className="block h-6 w-6 translate-x-1 rounded-full bg-white shadow transition data-[state=checked]:translate-x-7" />
      </Switch.Root>
    </div>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-[2px] data-[state=open]:animate-rise" />
        <Dialog.Content className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-card bg-white p-6 shadow-lift data-[state=open]:animate-rise sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-xl font-bold">{title}</Dialog.Title>
            <Dialog.Close className="-m-2 rounded-full p-2 text-navy-soft hover:bg-navy/5" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          {description && <Dialog.Description className="mt-2 text-navy-soft">{description}</Dialog.Description>}
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-lavender-soft text-lavender-deep">{icon}</div>
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-sm text-navy-soft">{children}</div>}
    </div>
  );
}
