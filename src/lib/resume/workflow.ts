import type {
  DocumentStatus,
  ResumeApplySection,
  ResumeProfileData,
} from "./types";

export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;
const PROFILE_ID = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,253}[a-zA-Z0-9])?$/;

export type ResumeDocumentPhase =
  | "processing"
  | "reviewing"
  | "rejected"
  | "needs_review"
  | "failed";

export const terminalDocumentStatuses = new Set<DocumentStatus>([
  "COMPLETED",
  "REJECTED",
  "NEEDS_REVIEW",
  "FAILED",
]);

export const documentStatusMessages: Record<DocumentStatus, string> = {
  PENDING_UPLOAD: "Preparando carga…",
  UPLOADED: "CV recibido…",
  VALIDATING: "Validando archivo…",
  PROCESSING: "Validando archivo…",
  PREPROCESSED: "Preparando análisis…",
  CLASSIFYING: "Analizando CV…",
  ACCEPTED: "Extrayendo información…",
  DATA_EXTRACTED: "Preparando perfil…",
  RAG_INDEXED: "Preparando perfil…",
  COMPLETED: "CV procesado",
  REJECTED: "El archivo no parece ser un CV",
  NEEDS_REVIEW: "El archivo necesita revision",
  FAILED: "No pudimos procesar el archivo",
};

export function validatePdfFile(file: {
  name: string;
  type?: string;
  size: number;
}): string | null {
  if (!file.name.trim().toLocaleLowerCase().endsWith(".pdf")) {
    return "Seleccioná un archivo con extensión .pdf.";
  }
  if (file.type && file.type.toLocaleLowerCase() !== "application/pdf") {
    return "El archivo debe ser un PDF.";
  }
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return "El PDF supera el límite de 20 MB.";
  }
  return null;
}

export function failedDocumentMessage(errorCode?: string | null): string {
  if (errorCode === "PDF_TEXT_NOT_EXTRACTABLE") {
    return "El PDF no contiene texto que podamos leer. Probá exportar nuevamente el CV como PDF.";
  }
  return "No pudimos procesar el CV. Intentá nuevamente.";
}

export function buildApplyPayload(input: {
  profileId: string;
  expectedRevision: number;
  sections: ResumeApplySection[];
}) {
  return {
    profile_id: input.profileId,
    expected_revision: input.expectedRevision,
    sections: Array.from(new Set(input.sections)),
  };
}

export function buildAuthoritativeUploadPayload(input: {
  profileId: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  if (!PROFILE_ID.test(input.profileId)) throw new Error("INVALID_PROFILE");
  const fileError = validatePdfFile({
    name: input.filename,
    type: input.mimeType,
    size: input.fileSizeBytes,
  });
  if (fileError) throw new Error("INVALID_PDF");
  return {
    tenant_id: "job-search",
    source_app: "job-search",
    processing_policy: "resume",
    filename: input.filename,
    mime_type: "application/pdf",
    file_size_bytes: input.fileSizeBytes,
    context: { profile_id: input.profileId },
  };
}

export function isSafeIdentifier(value: string): boolean {
  return PROFILE_ID.test(value);
}

export function phaseForDocumentStatus(
  status: DocumentStatus,
): ResumeDocumentPhase {
  switch (status) {
    case "REJECTED":
      return "rejected";
    case "NEEDS_REVIEW":
      return "needs_review";
    case "FAILED":
      return "failed";
    case "COMPLETED":
      return "reviewing";
    default:
      return "processing";
  }
}

export function hasSectionData(
  profile: ResumeProfileData,
  section: ResumeApplySection,
): boolean {
  switch (section) {
    case "full_name":
    case "headline":
    case "professional_summary":
    case "location":
      return Boolean(profile[section]?.trim());
    default:
      return profile[section].length > 0;
  }
}
