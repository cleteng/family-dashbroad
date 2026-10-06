"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/api-client";
import { TokenManageModal } from "@/components/admin/TokenManageModal";

type Dashboard = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export function DashboardList() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [tokenDash, setTokenDash] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<{ dashboards: Dashboard[] }>("/api/dashboards");
      setDashboards(data.dashboards);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<{ dashboards: Dashboard[] }>("/api/dashboards");
        if (cancelled) return;
        setError(null);
        setDashboards(data.dashboards);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "加载失败");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await apiSend("/api/dashboards", "POST", { name });
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function onRename(id: string, current: string) {
    const name = window.prompt("新名称", current)?.trim();
    if (!name || name === current) return;
    try {
      await apiSend(`/api/dashboards/${id}`, "PATCH", { name });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "重命名失败");
    }
  }

  async function onDelete(id: string, name: string) {
    if (!window.confirm(`确定删除看板「${name}」？相关小部件也会删除。`)) return;
    try {
      await apiSend(`/api/dashboards/${id}`, "DELETE");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">加载中…</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
        <label className="block text-sm">
          <span className="text-zinc-700">新建看板</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="名称"
            maxLength={100}
            className="mt-1 block w-56 rounded border border-zinc-300 px-2 py-1.5 text-sm"
            data-testid="new-dashboard-name"
          />
        </label>
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          data-testid="create-dashboard"
        >
          {creating ? "创建中…" : "新建"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {dashboards.length === 0 ? (
        <p className="text-sm text-zinc-500">还没有看板，先新建一个吧。</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
          {dashboards.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              data-testid={`dashboard-row-${d.id}`}
            >
              <div>
                <div className="font-medium text-zinc-900">{d.name}</div>
                {d.description ? (
                  <div className="text-xs text-zinc-500">{d.description}</div>
                ) : null}
              </div>
              <div className="flex gap-2 text-sm">
                <Link
                  href={`/admin/dashboards/${d.id}`}
                  className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
                  data-testid={`edit-dashboard-${d.id}`}
                >
                  编辑
                </Link>
                <button
                  type="button"
                  onClick={() => setTokenDash({ id: d.id, name: d.name })}
                  className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
                  data-testid={`token-manage-${d.id}`}
                >
                  展示链接
                </button>
                <button
                  type="button"
                  onClick={() => void onRename(d.id, d.name)}
                  className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
                >
                  重命名
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(d.id, d.name)}
                  className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {tokenDash ? (
        <TokenManageModal
          dashboardId={tokenDash.id}
          dashboardName={tokenDash.name}
          onClose={() => setTokenDash(null)}
        />
      ) : null}
    </div>
  );
}
