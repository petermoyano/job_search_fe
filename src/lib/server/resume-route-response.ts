import "server-only";

import { DocumentsApiError } from "./documents-api-core";

function messageForStatus(status?: number): string {
  if (status === 404) return "No encontramos el recurso solicitado.";
  if (status === 409) return "Los datos cambiaron o el CV todavía no está listo.";
  if (status === 413) return "El PDF supera el tamaño permitido.";
  if (status === 422) return "Los datos enviados no son válidos.";
  return "No pudimos completar la operación. Intentá nuevamente.";
}

export async function resumeRouteResponse(
  operation: () => Promise<unknown>,
): Promise<Response> {
  try {
    const payload = await operation();
    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DocumentsApiError) {
      const backendStatus = error.status;
      const safeStatus =
        backendStatus && [404, 409, 413, 422].includes(backendStatus)
          ? backendStatus
          : 502;
      return Response.json(
        { error: messageForStatus(backendStatus) },
        { status: safeStatus },
      );
    }
    return Response.json(
      { error: "La solicitud no es válida." },
      { status: 400 },
    );
  }
}
