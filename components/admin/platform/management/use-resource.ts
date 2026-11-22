"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { requestApi } from "./api";

export function useResource<T>(url: string) {
  const [value, setValue] = useState<T | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [generation, setGeneration] = useState(0);
  const reload = useCallback(() => setGeneration((current) => current + 1), []);
  useEffect(() => { window.addEventListener('platform-finance-updated', reload); return () => window.removeEventListener('platform-finance-updated', reload); }, [reload]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    requestApi<T>(url, { signal: controller.signal }).then((data) => { if (!controller.signal.aborted) setValue(data); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) { setValue(null); setError(cause instanceof Error ? cause.message : "Não foi possível carregar."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, generation]);
  return { value, error, loading, reload };
}

export function useMutation() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const locked = useRef(false);
  const pending = useRef<{ fingerprint: string; key: string } | null>(null);
  async function mutate<T>(url: string, method: string, body: unknown): Promise<T | undefined> {
    if (locked.current) return undefined;
    const fingerprint = JSON.stringify([url, method, body]);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, key: crypto.randomUUID() };
    locked.current = true; setBusy(true); setError("");
    try { const result = await requestApi<T>(url, { method, body, key: pending.current.key }); pending.current = null; return result; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar."); throw cause; }
    finally { locked.current = false; setBusy(false); }
  }
  return { mutate, busy, error, clearError: () => setError("") };
}
