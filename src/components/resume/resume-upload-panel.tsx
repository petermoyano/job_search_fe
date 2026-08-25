"use client";

import { ChangeEvent, useEffect, useReducer, useRef, useState } from "react";
import type { ProfileConfigDocument, RadarProfileConfig } from "@/lib/radar/types";
import {
  applyDraft,
  completeResumeUpload,
  getResumeDocument,
  getResumeDraft,
  listResumeDocuments,
  requestUploadUrl,
  ResumeApiError,
  uploadPdfToS3,
} from "@/lib/resume/api";
import type {
  ResumeApplySection,
  ResumeDocument,
  ResumeDraft,
} from "@/lib/resume/types";
import {
  buildApplyPayload,
  documentStatusMessages,
  failedDocumentMessage,
  phaseForDocumentStatus,
  terminalDocumentStatuses,
  validatePdfFile,
} from "@/lib/resume/workflow";
import {
  ResumeDraftReview,
  resumeSections,
} from "./resume-draft-review";

type Phase =
  | "idle"
  | "requesting_upload"
  | "uploading"
  | "confirming"
  | "processing"
  | "reviewing"
  | "applying"
  | "applied"
  | "rejected"
  | "needs_review"
  | "failed";

type State = {
  phase: Phase;
  document: ResumeDocument | null;
  draft: ResumeDraft | null;
  error: string | null;
  success: string | null;
};

type Action =
  | { type: "patch"; value: Partial<State> }
  | { type: "new_upload" };

const initialState: State = {
  phase: "idle",
  document: null,
  draft: null,
  error: null,
  success: null,
};

function reducer(state: State, action: Action): State {
  if (action.type === "new_upload") return initialState;
  return { ...state, ...action.value };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ResumeApiError ? error.message : fallback;
}

function defaultSections(draft: ResumeDraft): Set<ResumeApplySection> {
  return new Set(
    resumeSections
      .filter((section) => {
        const value = draft.payload[section.id];
        return Array.isArray(value) ? value.length > 0 : Boolean(value);
      })
      .map((section) => section.id),
  );
}

export function ResumeUploadPanel({
  profileId,
  profile,
  revision,
  isProfileDirty,
  onApplied,
}: {
  profileId: string;
  profile: RadarProfileConfig;
  revision: number;
  isProfileDirty: boolean;
  onApplied: (document: ProfileConfigDocument) => void;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<ResumeApplySection>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function restoreLatest() {
      try {
        const documents = await listResumeDocuments(profileId, controller.signal);
        const latest = documents[0];
        if (!latest) return;
        if (latest.status === "COMPLETED") {
          const draft = await getResumeDraft(latest.id, controller.signal);
          setSelected(defaultSections(draft));
          dispatch({
            type: "patch",
            value: { document: latest, draft, phase: "reviewing" },
          });
        } else {
          dispatch({
            type: "patch",
            value: { document: latest, phase: phaseForDocumentStatus(latest.status) },
          });
          if (!terminalDocumentStatuses.has(latest.status)) {
            setActiveDocumentId(latest.id);
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        dispatch({
          type: "patch",
          value: {
            error: errorMessage(error, "No pudimos recuperar el último CV."),
          },
        });
      }
    }
    void restoreLatest();
    return () => controller.abort();
  }, [profileId]);

  useEffect(() => {
    if (!activeDocumentId) return;
    const controller = new AbortController();
    async function poll() {
      const startedAt = Date.now();
      let attempts = 0;
      while (!controller.signal.aborted && Date.now() - startedAt < 5 * 60_000) {
        try {
          const document = await getResumeDocument(
            activeDocumentId as string,
            controller.signal,
          );
          dispatch({
            type: "patch",
            value: {
              document,
              phase: phaseForDocumentStatus(document.status),
              error: null,
            },
          });
          if (terminalDocumentStatuses.has(document.status)) {
            setActiveDocumentId(null);
            if (document.status === "COMPLETED") {
              const draft = await getResumeDraft(document.id, controller.signal);
              setSelected(defaultSections(draft));
              dispatch({
                type: "patch",
                value: { document, draft, phase: "reviewing" },
              });
            }
            return;
          }
          attempts += 1;
          const delay = attempts < 20 ? 1500 : 3000;
          await new Promise((resolve) => window.setTimeout(resolve, delay));
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          dispatch({
            type: "patch",
            value: {
              phase: "failed",
              error: errorMessage(error, "No pudimos consultar el estado del CV."),
            },
          });
          return;
        }
      }
      if (!controller.signal.aborted) {
        dispatch({
          type: "patch",
          value: {
            phase: "failed",
            error: "El procesamiento está demorando más de lo esperado. Podés volver a abrir la página para consultar el estado.",
          },
        });
      }
    }
    void poll();
    return () => controller.abort();
  }, [activeDocumentId]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validatePdfFile(file);
    if (validationError) {
      dispatch({ type: "patch", value: { error: validationError } });
      event.target.value = "";
      return;
    }

    dispatch({ type: "new_upload" });
    setActiveDocumentId(null);
    dispatch({ type: "patch", value: { phase: "requesting_upload" } });
    try {
      const upload = await requestUploadUrl({ profileId, file });
      dispatch({ type: "patch", value: { phase: "uploading" } });
      await uploadPdfToS3(file, upload);
      dispatch({ type: "patch", value: { phase: "confirming" } });
      const document = await completeResumeUpload(upload.document_id);
      dispatch({
        type: "patch",
        value: { document, phase: phaseForDocumentStatus(document.status) },
      });
      if (document.status === "COMPLETED") {
        const draft = await getResumeDraft(document.id);
        setSelected(defaultSections(draft));
        dispatch({
          type: "patch",
          value: { document, draft, phase: "reviewing" },
        });
      } else if (!terminalDocumentStatuses.has(document.status)) {
        setActiveDocumentId(document.id);
      }
    } catch (error) {
      dispatch({
        type: "patch",
        value: {
          phase: "failed",
          error: errorMessage(error, "No pudimos cargar el CV."),
        },
      });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function toggleSection(section: ResumeApplySection) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  async function handleApply() {
    if (!state.draft) return;
    if (isProfileDirty) {
      dispatch({
        type: "patch",
        value: {
          error: "Guardá o descartá los cambios manuales del perfil antes de aplicar el CV.",
        },
      });
      return;
    }
    if (selected.size === 0) {
      dispatch({
        type: "patch",
        value: { error: "Elegí al menos una sección para aplicar." },
      });
      return;
    }
    dispatch({
      type: "patch",
      value: { phase: "applying", error: null, success: null },
    });
    try {
      const result = await applyDraft(
        state.draft.id,
        buildApplyPayload({
          profileId,
          expectedRevision: revision,
          sections: [...selected],
        }),
      );
      onApplied(result);
      dispatch({
        type: "patch",
        value: {
          phase: "applied",
          success: "Perfil actualizado con la información seleccionada del CV.",
        },
      });
    } catch (error) {
      dispatch({
        type: "patch",
        value: {
          phase: "reviewing",
          error: errorMessage(error, "No pudimos actualizar el perfil."),
        },
      });
    }
  }

  const busy = [
    "requesting_upload",
    "uploading",
    "confirming",
    "processing",
    "applying",
  ].includes(state.phase);
  const status = state.document
    ? documentStatusMessages[state.document.status]
    : state.phase === "uploading"
      ? "Subiendo CV..."
      : state.phase === "confirming"
        ? "Confirmando carga..."
        : state.phase === "requesting_upload"
          ? "Preparando carga..."
          : null;

  return (
    <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold">CV</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Subí un PDF para detectar información profesional. Siempre vas a
            revisar y elegir los cambios antes de aplicarlos.
          </p>
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-slate-400">
          {busy ? "Procesando..." : "Subir CV en PDF"}
          <input
            ref={fileInput}
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={busy}
            onChange={handleFile}
            type="file"
          />
        </label>
      </div>

      {status && !terminalDocumentStatuses.has(state.document?.status ?? "UPLOADED") ? (
        <div
          aria-live="polite"
          className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"
          role="status"
        >
          <span className="font-semibold">{status}</span>
          <span className="ml-2">Esto puede tardar unos minutos.</span>
        </div>
      ) : null}

      {state.phase === "rejected" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          El archivo no parece ser un CV. Probá subir un currículum en formato PDF.
        </p>
      ) : null}
      {state.phase === "needs_review" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          No pudimos determinar con suficiente confianza si el archivo es un CV válido.
          Podés intentar con otro PDF.
        </p>
      ) : null}
      {state.phase === "failed" && state.document ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
          {failedDocumentMessage(state.document.error_code)}
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          {state.success}
        </p>
      ) : null}

      {state.draft ? (
        <>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-semibold">CV procesado correctamente</p>
            <p className="mt-1">
              {state.draft.payload.skills.length} skills ·{" "}
              {state.draft.payload.experience.length} experiencias ·{" "}
              {state.draft.payload.languages.length} idiomas
            </p>
          </div>
          <ResumeDraftReview
            disabled={state.phase === "applying"}
            draft={state.draft}
            onToggle={toggleSection}
            profile={profile}
            selected={selected}
          />
          {isProfileDirty ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              Hay cambios manuales sin guardar. Guardalos antes de aplicar datos del CV.
            </p>
          ) : null}
          <div className="flex justify-end">
            <button
              className="h-11 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
              disabled={state.phase === "applying" || selected.size === 0 || isProfileDirty}
              onClick={handleApply}
              type="button"
            >
              {state.phase === "applying" ? "Aplicando..." : "Aplicar secciones seleccionadas"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
