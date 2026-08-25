import assert from "node:assert/strict";
import test from "node:test";

import { DocumentsApiClient } from "../src/lib/server/documents-api-core.ts";
import {
  buildApplyPayload,
  buildAuthoritativeUploadPayload,
  documentStatusMessages,
  failedDocumentMessage,
  phaseForDocumentStatus,
  terminalDocumentStatuses,
  validatePdfFile,
} from "../src/lib/resume/workflow.ts";


test("PDF validation accepts PDFs and rejects extension, MIME and size errors", () => {
  assert.equal(
    validatePdfFile({ name: "cv.PDF", type: "application/pdf", size: 100 }),
    null,
  );
  assert.match(
    validatePdfFile({ name: "cv.txt", type: "application/pdf", size: 100 }) ?? "",
    /.pdf/,
  );
  assert.match(
    validatePdfFile({ name: "cv.pdf", type: "text/plain", size: 100 }) ?? "",
    /PDF/,
  );
  assert.match(
    validatePdfFile({
      name: "cv.pdf",
      type: "application/pdf",
      size: 20 * 1024 * 1024 + 1,
    }) ?? "",
    /20 MB/,
  );
});


test("upload payload always injects the authoritative document scope", () => {
  const payload = buildAuthoritativeUploadPayload({
    profileId: "peter-latam-remote-ai-fullstack-product",
    filename: "cv.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 123,
  });
  assert.deepEqual(payload, {
    tenant_id: "job-search",
    source_app: "job-search",
    processing_policy: "resume",
    filename: "cv.pdf",
    mime_type: "application/pdf",
    file_size_bytes: 123,
    context: { profile_id: "peter-latam-remote-ai-fullstack-product" },
  });
});


test("server client attaches the secret only as an Authorization header", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fakeFetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const client = new DocumentsApiClient(
    "https://backend.example/",
    "private-test-secret",
    fakeFetch as typeof fetch,
  );
  await client.createUploadUrl({ filename: "cv.pdf" });

  assert.equal(calls[0].url, "https://backend.example/documents/upload-url");
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("Authorization"), "Bearer private-test-secret");
  assert.doesNotMatch(String(calls[0].init?.body), /private-test-secret/);
});


test("status mapping drives processing and terminal UI states", () => {
  assert.equal(documentStatusMessages.CLASSIFYING, "Analizando CV…");
  assert.equal(phaseForDocumentStatus("COMPLETED"), "reviewing");
  assert.equal(phaseForDocumentStatus("REJECTED"), "rejected");
  assert.equal(phaseForDocumentStatus("NEEDS_REVIEW"), "needs_review");
  assert.equal(phaseForDocumentStatus("FAILED"), "failed");
  assert.equal(phaseForDocumentStatus("DATA_EXTRACTED"), "processing");
  assert.deepEqual(
    [...terminalDocumentStatuses],
    ["COMPLETED", "REJECTED", "NEEDS_REVIEW", "FAILED"],
  );
});


test("known permanent PDF failures get a safe actionable message", () => {
  assert.match(failedDocumentMessage("PDF_TEXT_NOT_EXTRACTABLE"), /no contiene texto/);
  assert.doesNotMatch(failedDocumentMessage("AWS_INTERNAL_STACK"), /AWS|STACK/);
});


test("apply payload contains only selected sections and deduplicates them", () => {
  assert.deepEqual(
    buildApplyPayload({
      profileId: "peter-latam-remote-ai-fullstack-product",
      expectedRevision: 4,
      sections: ["skills", "experience", "skills"],
    }),
    {
      profile_id: "peter-latam-remote-ai-fullstack-product",
      expected_revision: 4,
      sections: ["skills", "experience"],
    },
  );
});
