import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getOwnedDashboard } from "@/lib/dashboards";
import { DashboardEditor } from "@/components/admin/DashboardEditor";

type PageProps = { params: Promise<{ id: string }> };

export default async function DashboardEditorPage({ params }: PageProps) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect("/login?next=/admin");
  }

  const { id } = await params;
  const dashboard = getOwnedDashboard(session.userId, id);
  if (!dashboard) {
    notFound();
  }

  return (
    <DashboardEditor dashboardId={dashboard.id} initialName={dashboard.name} />
  );
}
