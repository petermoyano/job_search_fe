import {
  parseFeedbackResponse,
  parseHistory,
  parseProfileConfigDocument,
  parseProfiles,
  parseRadarRun,
} from "./parsers";
import type {
  FeedbackInput,
  HistoryOpportunity,
  OpportunityFeedback,
  ProfileConfigDocument,
  ProfileOption,
  RadarProfileConfig,
  RadarRunResponse,
  RequestError,
} from "./types";

const apiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

type JsonRequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  signal?: AbortSignal;
};

export class RadarApiError extends Error {
  readonly status?: number;
  readonly requestId?: string;

  constructor(message: string, options?: { status?: number; requestId?: string }) {
    super(message);
    this.name = "RadarApiError";
    this.status = options?.status;
    this.requestId = options?.requestId;
  }
}

function normalizeApiBaseUrl(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

function buildApiUrl(path: string): string {
  if (!apiBaseUrl) {
    throw new RadarApiError("Falta configurar NEXT_PUBLIC_API_BASE_URL.");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValidationLocation(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;

  const parts = value.filter(
    (part): part is string | number => typeof part === "string" || typeof part === "number",
  );
  return parts.length > 0 ? parts.join(".") : undefined;
}

function extractFastApiDetail(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;

  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail.trim();
  }

  if (!Array.isArray(payload.detail)) return undefined;

  const messages = payload.detail.flatMap((item) => {
    if (!isRecord(item) || typeof item.msg !== "string" || !item.msg.trim()) {
      return [];
    }

    const location = formatValidationLocation(item.loc);
    return [location ? `${location}: ${item.msg.trim()}` : item.msg.trim()];
  });

  return messages.length > 0 ? messages.join(" ") : undefined;
}

async function requestJson<T>(
  path: string,
  parser: (payload: unknown) => T,
  options: JsonRequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      method: options.method ?? "GET",
      headers: options.body === undefined
        ? { Accept: "application/json" }
        : { Accept: "application/json", "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new RadarApiError(
      "No pudimos comunicarnos con el servidor. Revisa la conexión e intenta de nuevo cuando estés lista.",
    );
  }

  const requestId = response.headers.get("X-Request-ID") ?? undefined;
  const responseText = await response.text();
  let payload: unknown;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new RadarApiError("El servidor devolvió una respuesta que no pudimos interpretar.", {
        status: response.status,
        requestId,
      });
    }
  }

  if (!response.ok) {
    const detail = extractFastApiDetail(payload);
    throw new RadarApiError(
      detail ?? `El servidor no pudo completar la solicitud (estado ${response.status}).`,
      { status: response.status, requestId },
    );
  }

  try {
    return parser(payload);
  } catch {
    throw new RadarApiError("La respuesta del servidor está incompleta o tiene un formato inesperado.", {
      status: response.status,
      requestId,
    });
  }
}

export function toRequestError(error: unknown, fallback: string): RequestError {
  if (error instanceof RadarApiError) {
    return { message: error.message, requestId: error.requestId };
  }

  return { message: fallback };
}

export function getProfiles(signal?: AbortSignal): Promise<ProfileOption[]> {
  return requestJson("/radar/profiles", parseProfiles, { signal });
}

export function getProfileConfig(
  profileId: string,
  signal?: AbortSignal,
): Promise<ProfileConfigDocument> {
  return requestJson(
    `/radar/profiles/${encodeURIComponent(profileId)}/config`,
    parseProfileConfigDocument,
    { signal },
  );
}

export function updateProfileConfig(input: {
  profileId: string;
  expectedRevision: number;
  profile: RadarProfileConfig;
}): Promise<ProfileConfigDocument> {
  return requestJson(
    `/radar/profiles/${encodeURIComponent(input.profileId)}/config`,
    parseProfileConfigDocument,
    {
      method: "PUT",
      body: {
        expected_revision: input.expectedRevision,
        profile: input.profile,
      },
    },
  );
}

export function getHistory(
  profileId: string,
  options: {
    includeExcluded?: boolean;
    limit?: number;
    signal?: AbortSignal;
  } = {},
): Promise<HistoryOpportunity[]> {
  const query = new URLSearchParams({
    profile_id: profileId,
    include_excluded: String(options.includeExcluded ?? false),
  });
  if (options.limit !== undefined) query.set("limit", String(options.limit));

  return requestJson(`/radar/opportunities?${query.toString()}`, parseHistory, {
    signal: options.signal,
  });
}

export function runRadar(input: {
  profileId: string;
  limit: number;
}): Promise<RadarRunResponse> {
  return requestJson("/radar/runs", parseRadarRun, {
    method: "POST",
    body: {
      profile_id: input.profileId,
      source: "configured",
      limit: input.limit,
    },
  });
}

export function saveOpportunityFeedback(
  opportunityId: string,
  input: FeedbackInput,
): Promise<OpportunityFeedback> {
  return requestJson(
    `/radar/opportunities/${encodeURIComponent(opportunityId)}/feedback`,
    (payload) =>
      parseFeedbackResponse(payload, {
        opportunityId,
        profileId: input.profileId,
      }),
    {
      method: "PUT",
      body: {
        profile_id: input.profileId,
        action: input.action,
        reason_codes: input.reasonCodes,
        notes: input.notes ?? null,
      },
    },
  );
}
