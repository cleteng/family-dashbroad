import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/auth";

async function logoutAction() {
  "use server";
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect("/login?next=/admin");
  }

  const user = findUserById(session.userId);
  if (!user) {
    redirect("/login?next=/admin");
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-2 text-zinc-600">
        Signed in as <strong>{user.email}</strong>
      </p>
      <p className="mt-4 text-sm text-zinc-500">
        Dashboard management will be implemented in later tasks.
      </p>
      <form action={logoutAction} className="mt-6">
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          登出
        </button>
      </form>
    </main>
  );
}
