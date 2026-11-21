import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <LogoMark size={64} />
      <h1 className="mt-6 text-2xl font-bold">This page isn’t here.</h1>
      <Link href="/" className="mt-6 inline-flex min-h-[56px] items-center rounded-2xl bg-lavender-deep px-6 text-lg font-semibold text-white">
        Go to Ruko home
      </Link>
    </main>
  );
}
