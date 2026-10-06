"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/api-client";

type TokenItem = {
  id: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

function formatTime(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function TokenManageModal({
  dashboardId,
  dashboardName,
  onClose,
}: {
  dashboardId: string;
  dashboardName: string;
  onClose: () => void;
}) {
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealUrl, setRevealUrl] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<{ tokens: TokenItem[] }>(
        `/api/dashboards/${dashboardId}/display-tokens`,
      );
      setTokens(data.tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<{ tokens: TokenItem[] }>(
          `/api/dashboards/${dashboardId}/display-tokens`,
        );
        if (cancelled) return;
        setTokens(data.tokens);
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
  }, [dashboardId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setCopyHint(null);
    try {
      const name = newName.trim() || "展示链接";
      const res = await apiSend<{
        token: string;
        displayUrl: string;
        id: string;
      }>(`/api/dashboards/${dashboardId}/display-tokens`, "POST", { name });
      const full = `${window.location.origin}${res.displayUrl}`;
      setRevealUrl(full);
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function onToggle(t: TokenItem) {
    try {
      await apiSend(`/api/dashboards/${dashboardId}/display-tokens/${t.id}`, "PATCH", {
        isActive: !t.isActive,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function onRegenerate(t: TokenItem) {
    if (!window.confirm("重新生成后旧链接立即失效，确定吗？")) return;
    setError(null);
    setCopyHint(null);
    setRevealUrl(null); // clear so UI cannot show stale URL
    try {
      const res = await apiSend<{ token: string; displayUrl: string }>(
        `/api/dashboards/${dashboardId}/display-tokens/${t.id}/regenerate`,
        "POST",
        {}, // ensure POST body + Content-Type
      );
      if (!res.token || !res.displayUrl) {
        throw new Error("重新生成响应缺少 token");
      }
      const full = `${window.location.origin}${res.displayUrl}`;
      setRevealUrl(full);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "重新生成失败");
    }
  }

  async function onDelete(t: TokenItem) {
    if (!window.confirm(`删除展示链接「${t.name || t.id}」？`)) return;
    try {
      await apiSend(`/api/dashboards/${dashboardId}/display-tokens/${t.id}`, "DELETE");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function onCopy(url: string) {
    const ok = await copyText(url);
    setCopyHint(ok ? "已复制" : "复制失败，请手动选择下方文本");
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg"
        data-testid="token-manage-modal"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">展示链接 — {dashboardName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-500"
            data-testid="token-modal-close"
          >
            关闭
          </button>
        </div>

        <form onSubmit={onCreate} className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="名称（可空）"
            className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
            data-testid="token-new-name"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            data-testid="token-create"
          >
            {creating ? "创建中…" : "＋ 新建链接"}
          </button>
        </form>

        {revealUrl ? (
          <div
            className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm"
            data-testid="token-reveal"
          >
            <p className="mb-1 font-medium text-emerald-900">完整 URL（仅显示一次，请复制保存）</p>
            <input
              type="text"
              readOnly
              value={revealUrl}
              className="mb-2 w-full rounded border border-emerald-300 bg-white px-2 py-1 font-mono text-xs"
              data-testid="token-reveal-url"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className="rounded border border-emerald-600 px-2 py-1 text-emerald-800"
              onClick={() => void onCopy(revealUrl)}
              data-testid="token-copy-reveal"
            >
              复制
            </button>
            {copyHint ? <span className="ml-2 text-xs text-emerald-700">{copyHint}</span> : null}
          </div>
        ) : null}

        {error ? (
          <p className="mb-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-500">加载中…</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-zinc-500">还没有展示链接</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {tokens.map((t) => (
              <li key={t.id} className="py-3 text-sm" data-testid={`token-row-${t.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {t.name || "展示链接"}{" "}
                      <span className={t.isActive ? "text-emerald-600" : "text-zinc-400"}>
                        {t.isActive ? "启用中" : "已禁用"}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      创建 {formatTime(t.createdAt)} · 最近使用 {formatTime(t.lastUsedAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50"
                      onClick={() => void onToggle(t)}
                      data-testid={`token-toggle-${t.id}`}
                    >
                      {t.isActive ? "禁用" : "启用"}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50"
                      onClick={() => void onRegenerate(t)}
                      data-testid={`token-regen-${t.id}`}
                    >
                      重新生成
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                      onClick={() => void onDelete(t)}
                      data-testid={`token-delete-${t.id}`}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
