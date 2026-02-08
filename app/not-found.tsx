import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <h2 className="text-xl font-medium">Not Found</h2>
      <p>Could not find requested resource</p>
      <Link
        href="/"
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
      >
        Return Home
      </Link>
    </div>
  );
}
