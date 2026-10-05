/**
 * Display route — must be accessible WITHOUT admin session.
 * Token validation will be implemented when Display Token feature lands.
 * For TASK-003 we only prove that this path is not blocked by auth middleware.
 */
export default async function DisplayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <h1 className="text-2xl font-semibold">Display</h1>
      <p className="mt-2 text-sm text-zinc-400">Token: {token.slice(0, 8)}…</p>
      <p className="mt-4 text-xs text-zinc-500">No admin login required (TASK-003)</p>
    </main>
  );
}
