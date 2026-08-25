export class DocumentsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "DocumentsApiError";
  }
}

type FetchLike = typeof fetch;

export class DocumentsApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly clientSecret: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.baseUrl.replace(/\/+$/, "")}${path}`,
        {
          ...init,
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.clientSecret}`,
            ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
            ...init.headers,
          },
        },
      );
    } catch {
      throw new DocumentsApiError("Backend unavailable");
    }
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new DocumentsApiError("Invalid backend response", response.status);
      }
    }
    if (!response.ok) {
      throw new DocumentsApiError("Backend request failed", response.status);
    }
    return payload;
  }

  createUploadUrl(payload: unknown) {
    return this.request("/documents/upload-url", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  completeUpload(documentId: string) {
    return this.request(`/documents/${encodeURIComponent(documentId)}/complete-upload`, {
      method: "POST",
    });
  }

  getDocument(documentId: string) {
    return this.request(`/documents/${encodeURIComponent(documentId)}`);
  }

  getDocumentResult(documentId: string) {
    return this.request(`/documents/${encodeURIComponent(documentId)}/result`);
  }

  listProfileDocuments(profileId: string) {
    return this.request(
      `/profiles/${encodeURIComponent(profileId)}/resume-documents`,
    );
  }

  applyResumeDraft(draftId: string, payload: unknown) {
    return this.request(
      `/resume-profile-drafts/${encodeURIComponent(draftId)}/apply`,
      { method: "POST", body: JSON.stringify(payload) },
    );
  }
}
