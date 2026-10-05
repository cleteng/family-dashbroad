import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Family Dashboard</h1>
      <p className="text-zinc-600">
        Open-source self-hosted family information center.
      </p>
      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/login" className="underline hover:text-zinc-700">
          Admin login
        </Link>
        <Link href="/admin" className="underline hover:text-zinc-700">
          Admin
        </Link>
      </div>
    </main>
  );
}
