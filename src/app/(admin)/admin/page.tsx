import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/auth";
import { DashboardList } from "@/components/admin/DashboardList";

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
    <main className="mx-auto max-w-3xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">看板管理</h1>
          <p className="mt-1 text-sm text-zinc-600">已登录：{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/settings/home-assistant"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            data-testid="nav-ha-settings"
          >
            Home Assistant
          </a>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              登出
            </button>
          </form>
        </div>
      </div>
      <DashboardList />
    </main>
  );
}
