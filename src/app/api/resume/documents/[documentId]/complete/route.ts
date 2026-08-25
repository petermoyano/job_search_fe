import { completeUpload } from "@/lib/server/documents-api";
import { isSafeIdentifier } from "@/lib/resume/workflow";
import { resumeRouteResponse } from "@/lib/server/resume-route-response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  return resumeRouteResponse(async () => {
    const { documentId } = await params;
    if (!isSafeIdentifier(documentId)) throw new Error("INVALID_ID");
    return completeUpload(documentId);
  });
}
