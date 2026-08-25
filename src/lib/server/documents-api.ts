import "server-only";

import { DocumentsApiClient, DocumentsApiError } from "./documents-api-core";

function getClient(): DocumentsApiClient {
  const baseUrl = (
    process.env.JOB_SEARCH_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL
  )?.trim();
  const secret = process.env.JOB_SEARCH_DOCUMENT_CLIENT_SECRET?.trim();
  if (!baseUrl || !secret) {
    throw new DocumentsApiError("Documents API is not configured");
  }
  return new DocumentsApiClient(baseUrl, secret);
}

export function createUploadUrl(payload: unknown) {
  return getClient().createUploadUrl(payload);
}

export function completeUpload(documentId: string) {
  return getClient().completeUpload(documentId);
}

export function getDocument(documentId: string) {
  return getClient().getDocument(documentId);
}

export function getDocumentResult(documentId: string) {
  return getClient().getDocumentResult(documentId);
}

export function listProfileDocuments(profileId: string) {
  return getClient().listProfileDocuments(profileId);
}

export function applyResumeDraft(draftId: string, payload: unknown) {
  return getClient().applyResumeDraft(draftId, payload);
}
