export function DisplayError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white"
      data-testid="display-error"
    >
      <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-400">{message}</p>
    </main>
  );
}
