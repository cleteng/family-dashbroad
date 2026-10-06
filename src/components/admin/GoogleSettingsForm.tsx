"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiSend } from "@/lib/api-client";

type GoogleStatus = {
  connected: boolean;
  configured: boolean;
  email?: string;
};

export function GoogleSettingsForm() {
  const search = useSearchParams();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"ok" | "err">("ok");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<GoogleStatus>("/api/settings/google");
      setStatus(data);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "加载失败");
      setMessageKind("err");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = setTimeout(() => {
      if (!cancelled) void load();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [load]);

  useEffect(() => {
    const err = search.get("error");
    const connected = search.get("connected");
    if (!err && !connected) return;
    // Defer setState so it is not synchronous with the effect body
    // (avoids react-hooks/set-state-in-effect cascading-render lint).
    queueMicrotask(() => {
      if (err) {
        setMessage(err);
        setMessageKind("err");
      } else if (connected) {
        setMessage("已连接 Google");
        setMessageKind("ok");
        void load();
      }
    });
  }, [search, load]);

  async function onRevoke() {
    if (!confirm("确定断开 Google 连接？本地令牌将被删除。")) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiSend("/api/settings/google/revoke", "POST");
      setStatus((s) => (s ? { ...s, connected: false, email: undefined } : s));
      setMessage("已断开连接");
      setMessageKind("ok");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "断开失败");
      setMessageKind("err");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        className="text-sm text-zinc-500"
        data-testid="google-settings-loading"
      >
        加载中…
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="google-settings-form">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={
            status?.connected
              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800"
              : "rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600"
          }
          data-testid="google-status"
        >
          {status?.connected ? "已连接" : "未连接"}
        </span>
        {status?.email ? (
          <span className="text-zinc-500" data-testid="google-email">
            {status.email}
          </span>
        ) : null}
      </div>

      {!status?.configured ? (
        <p
          className="text-sm text-amber-700"
          data-testid="google-not-configured"
        >
          尚未配置{" "}
          <code className="rounded bg-zinc-100 px-1">GOOGLE_CLIENT_ID</code> /{" "}
          <code className="rounded bg-zinc-100 px-1">GOOGLE_CLIENT_SECRET</code>
          。请在 Google Cloud Console 创建 OAuth 客户端后写入环境变量。
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {status?.connected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onRevoke()}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
            data-testid="google-revoke"
          >
            断开连接
          </button>
        ) : (
          <a
            href="/api/auth/google"
            className={
              "rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 " +
              (!status?.configured ? "pointer-events-none opacity-50" : "")
            }
            data-testid="google-connect"
            aria-disabled={!status?.configured}
          >
            连接 Google
          </a>
        )}
      </div>

      {message ? (
        <p
          className={
            messageKind === "ok"
              ? "text-sm text-emerald-700"
              : "text-sm text-red-600"
          }
          data-testid="google-message"
        >
          {message}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-zinc-500">
        仅申请 Google Tasks 权限。Access / Refresh Token
        不会出现在页面或接口响应中。
      </p>
    </div>
  );
}
