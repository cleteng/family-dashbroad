"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/api-client";

type HAPublic = {
  url: string;
  hasToken: boolean;
  connected?: boolean;
  version?: string;
};

export function HASettingsForm() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [connected, setConnected] = useState(false);
  const [version, setVersion] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"ok" | "err">("ok");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiGet<HAPublic>("/api/settings/home-assistant");
      setUrl(data.url || "");
      setHasToken(data.hasToken);
      setConnected(Boolean(data.connected));
      setVersion(data.version);
      setToken(""); // never prefill token
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

  async function onTest() {
    setBusy(true);
    setMessage(null);
    try {
      // If token field empty but we have saved token, ask user to re-paste for test
      // or call with only URL — API requires token. Use typed token only.
      const body = {
        url: url.trim(),
        token: token.trim(),
      };
      if (!body.url || !body.token) {
        setMessage("请填写 URL 和 Token 后再测试");
        setMessageKind("err");
        return;
      }
      const res = await apiSend<{
        connected: boolean;
        version?: string;
        error?: string;
      }>("/api/settings/home-assistant/test", "POST", body);
      if (res.connected) {
        setConnected(true);
        setVersion(res.version);
        setMessage(
          res.version ? `连接成功 · Home Assistant ${res.version}` : "连接成功",
        );
        setMessageKind("ok");
      } else {
        setConnected(false);
        setVersion(undefined);
        setMessage("连接失败");
        setMessageKind("err");
      }
    } catch {
      setConnected(false);
      setVersion(undefined);
      setMessage("连接失败");
      setMessageKind("err");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    setBusy(true);
    setMessage(null);
    try {
      if (!url.trim()) {
        setMessage("请填写 Home Assistant URL");
        setMessageKind("err");
        return;
      }
      const res = await apiSend<{
        url: string;
        hasToken: boolean;
        ok: boolean;
      }>("/api/settings/home-assistant", "POST", {
        url: url.trim(),
        token: token.trim(),
      });
      setUrl(res.url);
      setHasToken(res.hasToken);
      setToken(""); // clear token field after save
      setMessage(res.hasToken ? "已保存" : "已保存（未设置 Token）");
      setMessageKind("ok");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失败");
      setMessageKind("err");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-zinc-500" data-testid="ha-settings-loading">
        加载中…
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="ha-settings-form">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={
            connected
              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800"
              : "rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600"
          }
          data-testid="ha-status"
        >
          {connected ? "已连接" : "未连接"}
        </span>
        {version ? (
          <span className="text-zinc-500" data-testid="ha-version">
            v{version}
          </span>
        ) : null}
        {hasToken ? (
          <span className="text-xs text-zinc-400">Token 已配置</span>
        ) : (
          <span className="text-xs text-zinc-400">Token 未配置</span>
        )}
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-zinc-700">Home Assistant URL</span>
        <input
          type="url"
          className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder="http://homeassistant.local:8123"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          data-testid="ha-url"
          autoComplete="off"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-zinc-700">
          长期访问令牌
          {hasToken ? (
            <span className="ml-1 font-normal text-zinc-400">
              （留空则保留已保存的 Token）
            </span>
          ) : null}
        </span>
        <input
          type="password"
          className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder={hasToken ? "••••••••" : "粘贴 Long-Lived Access Token"}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          data-testid="ha-token"
          autoComplete="off"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onTest()}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
          data-testid="ha-test"
        >
          测试连接
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave()}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
          data-testid="ha-save"
        >
          保存
        </button>
      </div>

      {message ? (
        <p
          className={
            messageKind === "ok"
              ? "text-sm text-emerald-700"
              : "text-sm text-red-600"
          }
          data-testid="ha-message"
        >
          {message}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-zinc-500">
        Token 不会显示在页面或接口响应中。也可通过环境变量{" "}
        <code className="rounded bg-zinc-100 px-1">HA_URL</code> /{" "}
        <code className="rounded bg-zinc-100 px-1">HA_TOKEN</code> 配置。
      </p>
    </div>
  );
}
