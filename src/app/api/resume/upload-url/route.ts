import { createUploadUrl } from "@/lib/server/documents-api";
import { buildAuthoritativeUploadPayload } from "@/lib/resume/workflow";
import { resumeRouteResponse } from "@/lib/server/resume-route-response";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("INVALID_BODY");
  }
  return value as Record<string, unknown>;
}

export async function POST(request: Request) {
  return resumeRouteResponse(async () => {
    const body = record(await request.json());
    if (
      typeof body.profileId !== "string" ||
      typeof body.filename !== "string" ||
      typeof body.mimeType !== "string" ||
      typeof body.fileSizeBytes !== "number"
    ) {
      throw new Error("INVALID_BODY");
    }
    return createUploadUrl(
      buildAuthoritativeUploadPayload({
        profileId: body.profileId,
        filename: body.filename,
        mimeType: body.mimeType,
        fileSizeBytes: body.fileSizeBytes,
      }),
    );
  });
}
