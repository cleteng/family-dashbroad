import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/auth";
import { HASettingsForm } from "@/components/admin/HASettingsForm";

export default async function HomeAssistantSettingsPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect("/login?next=/admin/settings/home-assistant");
  }

  const user = findUserById(session.userId);
  if (!user) {
    redirect("/login?next=/admin/settings/home-assistant");
  }

  return (
    <main className="mx-auto max-w-lg p-6 md:p-8">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← 返回看板管理
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Home Assistant</h1>
        <p className="mt-1 text-sm text-zinc-600">配置连接，供后续传感器 / 开关小部件使用</p>
      </div>
      <HASettingsForm />
    </main>
  );
}
