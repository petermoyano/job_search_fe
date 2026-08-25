import { parseProfileConfigDocument } from "@/lib/radar/parsers";
import type { ProfileConfigDocument } from "@/lib/radar/types";
import type {
  DocumentStatus,
  ResumeDocument,
  ResumeDraft,
  UploadUrlResponse,
} from "./types";

const statuses = new Set<DocumentStatus>([
  "PENDING_UPLOAD",
  "UPLOADED",
  "VALIDATING",
  "PROCESSING",
  "PREPROCESSED",
  "CLASSIFYING",
  "ACCEPTED",
  "DATA_EXTRACTED",
  "RAG_INDEXED",
  "COMPLETED",
  "REJECTED",
  "NEEDS_REVIEW",
  "FAILED",
]);

export class ResumeApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ResumeApiError";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ResumeApiError("La respuesta del servidor no es válida.");
  }
  return value as Record<string, unknown>;
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ResumeApiError("No pudimos comunicarnos con el servidor.");
  }
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ResumeApiError("El servidor devolvió una respuesta inválida.");
    }
  }
  if (!response.ok) {
    const record = body && typeof body === "object" ? asRecord(body) : {};
    throw new ResumeApiError(
      typeof record.error === "string"
        ? record.error
        : "No pudimos completar la operación.",
      response.status,
    );
  }
  return body;
}

function parseDocument(value: unknown): ResumeDocument {
  const body = asRecord(value);
  if (
    typeof body.id !== "string" ||
    typeof body.status !== "string" ||
    !statuses.has(body.status as DocumentStatus)
  ) {
    throw new ResumeApiError("El estado del CV no es válido.");
  }
  return {
    id: body.id,
    status: body.status as DocumentStatus,
    filename: typeof body.filename === "string" ? body.filename : "CV.pdf",
    result_id: typeof body.result_id === "string" ? body.result_id : null,
    error_code: typeof body.error_code === "string" ? body.error_code : null,
    created_at: typeof body.created_at === "string" ? body.created_at : "",
    updated_at: typeof body.updated_at === "string" ? body.updated_at : "",
  };
}

export async function requestUploadUrl(input: {
  profileId: string;
  file: File;
}): Promise<UploadUrlResponse> {
  const body = asRecord(
    await requestJson("/api/resume/upload-url", {
      method: "POST",
      body: JSON.stringify({
        profileId: input.profileId,
        filename: input.file.name,
        mimeType: input.file.type || "application/pdf",
        fileSizeBytes: input.file.size,
      }),
    }),
  );
  if (
    typeof body.document_id !== "string" ||
    typeof body.upload_url !== "string" ||
    !body.required_headers ||
    typeof body.required_headers !== "object" ||
    Array.isArray(body.required_headers)
  ) {
    throw new ResumeApiError("No pudimos preparar la carga.");
  }
  return {
    document_id: body.document_id,
    status: body.status as DocumentStatus,
    upload_url: body.upload_url,
    required_headers: body.required_headers as Record<string, string>,
  };
}

export async function uploadPdfToS3(
  file: File,
  upload: UploadUrlResponse,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(upload.upload_url, {
      method: "PUT",
      headers: upload.required_headers,
      body: file,
    });
  } catch {
    throw new ResumeApiError("No pudimos subir el PDF.");
  }
  if (!response.ok) throw new ResumeApiError("No pudimos subir el PDF.");
}

export async function completeResumeUpload(
  documentId: string,
): Promise<ResumeDocument> {
  return parseDocument(
    await requestJson(
      `/api/resume/documents/${encodeURIComponent(documentId)}/complete`,
      { method: "POST" },
    ),
  );
}

export async function getResumeDocument(
  documentId: string,
  signal?: AbortSignal,
): Promise<ResumeDocument> {
  return parseDocument(
    await requestJson(
      `/api/resume/documents/${encodeURIComponent(documentId)}`,
      { signal },
    ),
  );
}

export async function getResumeDraft(
  documentId: string,
  signal?: AbortSignal,
): Promise<ResumeDraft> {
  const body = asRecord(
    await requestJson(
      `/api/resume/documents/${encodeURIComponent(documentId)}/result`,
      { signal },
    ),
  );
  if (
    typeof body.id !== "string" ||
    typeof body.document_id !== "string" ||
    !body.payload ||
    typeof body.payload !== "object"
  ) {
    throw new ResumeApiError("El perfil detectado está incompleto.");
  }
  return body as ResumeDraft;
}

export async function listResumeDocuments(
  profileId: string,
  signal?: AbortSignal,
): Promise<ResumeDocument[]> {
  const body = await requestJson(
    `/api/resume/profiles/${encodeURIComponent(profileId)}/documents`,
    { signal },
  );
  if (!Array.isArray(body)) {
    throw new ResumeApiError("No pudimos leer los CV del perfil.");
  }
  return body.map(parseDocument);
}

export async function applyDraft(
  draftId: string,
  payload: unknown,
): Promise<ProfileConfigDocument> {
  const response = await requestJson(
    `/api/resume/drafts/${encodeURIComponent(draftId)}/apply`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return parseProfileConfigDocument(response);
}
