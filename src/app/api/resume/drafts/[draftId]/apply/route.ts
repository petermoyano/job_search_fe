import { applyResumeDraft } from "@/lib/server/documents-api";
import { isSafeIdentifier } from "@/lib/resume/workflow";
import { resumeRouteResponse } from "@/lib/server/resume-route-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  return resumeRouteResponse(async () => {
    const { draftId } = await params;
    if (!isSafeIdentifier(draftId)) throw new Error("INVALID_ID");
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("INVALID_BODY");
    }
    return applyResumeDraft(draftId, body);
  });
}
