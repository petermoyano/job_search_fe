import { listProfileDocuments } from "@/lib/server/documents-api";
import { isSafeIdentifier } from "@/lib/resume/workflow";
import { resumeRouteResponse } from "@/lib/server/resume-route-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  return resumeRouteResponse(async () => {
    const { profileId } = await params;
    if (!isSafeIdentifier(profileId)) throw new Error("INVALID_ID");
    return listProfileDocuments(profileId);
  });
}
