import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/auth";
import { GoogleSettingsForm } from "@/components/admin/GoogleSettingsForm";

export default async function GoogleSettingsPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect("/login?next=/admin/settings/google");
  }

  const user = findUserById(session.userId);
  if (!user) {
    redirect("/login?next=/admin/settings/google");
  }

  return (
    <main className="mx-auto max-w-lg p-6 md:p-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← 返回看板管理
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Google 账号</h1>
        <p className="mt-1 text-sm text-zinc-600">
          授权后可用于 Google Tasks 小部件（后续任务）
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-zinc-500">加载中…</div>}>
        <GoogleSettingsForm />
      </Suspense>
    </main>
  );
}
