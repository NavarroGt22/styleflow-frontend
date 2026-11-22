"use client";

export async function requestApi<T>(url: string, options: { method?: string; body?: unknown; key?: string; signal?: AbortSignal; redirectOnUnauthorized?: boolean } = {}): Promise<T> {
  const method = options.method ?? "GET";
  const response = await fetch(url, {
    method, credentials: "same-origin", cache: "no-store", signal: options.signal,
    headers: method === "GET" ? {} : { "Content-Type": "application/json", "X-Platform-CSRF": "1", ...(options.key ? { "Idempotency-Key": options.key } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const json = response.status === 204 ? undefined : await response.json();
  if (response.status === 401 && options.redirectOnUnauthorized !== false) { window.location.replace("/login?next=/platform/super"); throw new Error("Sua sessão terminou. Entre novamente."); }
  if (!response.ok) throw new Error((typeof json?.error === "string" ? json.error : json?.error?.message) ?? "Não foi possível concluir. Tente novamente.");
  return json as T;
}

export async function downloadCsv(url: string): Promise<void> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) { const json = await response.json(); throw new Error((typeof json?.error === "string" ? json.error : json?.error?.message) ?? "Não foi possível exportar."); }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = objectUrl;
  link.download = /filename="?([^";]+)/i.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "gestao.csv";
  link.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function civilToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
