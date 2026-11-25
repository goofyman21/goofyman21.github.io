import { Mark } from "@/components/mark";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative z-10 grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Mark className="mx-auto h-14 w-14" />
        <h1 className="mt-6 font-serif text-5xl italic tracking-tight">Off the book</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">That page is not part of Meridian.</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm text-background"
        >
          Back to holdings
        </Link>
      </div>
    </main>
  );
}
