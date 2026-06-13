// Thin fetch wrappers around the /api/admin/* endpoints. Always credentials:
// "include" so the session cookie travels. Throws ConsoleApiError when the
// server returns non-2xx so page hooks can render error states.
import type {
  AdminCost,
  AdminDataset,
  AdminDatasetCreateBody,
  AdminDatasetsList,
  AdminFunnel,
  AdminLabelBody,
  AdminLatency,
  AdminOverview,
  AdminPipeline,
  AdminPricing,
  AdminPricingRow,
  AdminQuality,
  AdminSessionDetail,
  AdminSessionList,
  TurnRecord,
} from "@kapruka/protocol";

export class ConsoleApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { Accept: "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let code = "http_error";
    try {
      const body = (await res.json()) as { error?: string };
      if (typeof body.error === "string") code = body.error;
    } catch {
      // No JSON body.
    }
    throw new ConsoleApiError(`Request to ${path} failed`, res.status, code);
  }
  return (await res.json()) as T;
}

export const adminApi = {
  me(): Promise<{ authenticated: boolean; email?: string }> {
    return call("/api/admin/me");
  },
  async login(email: string, password: string): Promise<{ email: string }> {
    return call("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },
  async logout(): Promise<{ ok: boolean }> {
    return call("/api/admin/logout", { method: "POST" });
  },
  overview(): Promise<AdminOverview> {
    return call("/api/admin/overview");
  },
  cost(): Promise<AdminCost> {
    return call("/api/admin/cost");
  },
  latency(): Promise<AdminLatency> {
    return call("/api/admin/latency");
  },
  quality(): Promise<AdminQuality> {
    return call("/api/admin/quality");
  },
  funnel(): Promise<AdminFunnel> {
    return call("/api/admin/funnel");
  },
  pipeline(): Promise<AdminPipeline> {
    return call("/api/admin/pipeline");
  },
  sessions(params: {
    page?: number;
    pageSize?: number;
    outcome?: string;
    locale?: string;
    search?: string;
  }): Promise<AdminSessionList> {
    const url = new URL("/api/admin/sessions", window.location.origin);
    if (params.page !== undefined) url.searchParams.set("page", String(params.page));
    if (params.pageSize !== undefined) url.searchParams.set("pageSize", String(params.pageSize));
    if (params.outcome) url.searchParams.set("outcome", params.outcome);
    if (params.locale) url.searchParams.set("locale", params.locale);
    if (params.search) url.searchParams.set("search", params.search);
    return call(url.pathname + url.search);
  },
  sessionDetail(id: string): Promise<AdminSessionDetail> {
    return call(`/api/admin/sessions/${encodeURIComponent(id)}`);
  },
  turn(id: string): Promise<TurnRecord> {
    return call(`/api/admin/turns/${encodeURIComponent(id)}`);
  },
  labelTurn(id: string, body: AdminLabelBody): Promise<TurnRecord> {
    return call(`/api/admin/turns/${encodeURIComponent(id)}/label`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
  pricing(): Promise<AdminPricing> {
    return call("/api/admin/pricing");
  },
  setPricing(rows: AdminPricingRow[]): Promise<AdminPricing> {
    return call("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
  },
  datasets(): Promise<AdminDatasetsList> {
    return call("/api/admin/datasets");
  },
  createDataset(body: AdminDatasetCreateBody): Promise<AdminDataset> {
    return call("/api/admin/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
  exportDatasetUrl(id: string): string {
    return `/api/admin/datasets/${encodeURIComponent(id)}/export`;
  },
};
