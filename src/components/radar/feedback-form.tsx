"use client";

import { FormEvent, useId, useState } from "react";
import {
  feedbackActionLabels,
  feedbackReasonLabels,
  negativeFeedbackReasonCodes,
  positiveFeedbackReasonCodes,
} from "@/lib/radar/presentation";
import type {
  FeedbackAction,
  FeedbackInput,
  FeedbackReasonCode,
  OpportunityFeedback,
  RequestError,
} from "@/lib/radar/types";

export type FeedbackSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success" }
  | { status: "error"; error: RequestError };

type FeedbackFormProps = {
  feedback?: OpportunityFeedback;
  profileId: string;
  saveState: FeedbackSaveState;
  onSave: (input: FeedbackInput) => Promise<void>;
};

const feedbackActions: FeedbackAction[] = [
  "interested", "not_relevant", "should_have_been_shown", "applied",
];

function actionRequiresReasons(action: FeedbackAction | ""): boolean {
  return action === "not_relevant" || action === "should_have_been_shown";
}

export function FeedbackForm({
  feedback,
  profileId,
  saveState,
  onSave,
}: FeedbackFormProps) {
  const formId = useId();
  const [action, setAction] = useState<FeedbackAction | "">(feedback?.action ?? "");
  const [reasonCodes, setReasonCodes] = useState<FeedbackReasonCode[]>(
    feedback?.reasonCodes ?? [],
  );
  const [notes, setNotes] = useState(feedback?.notes ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  function selectAction(nextAction: FeedbackAction) {
    setAction(nextAction);
    setValidationError(null);
    if (!actionRequiresReasons(nextAction)) {
      setReasonCodes([]);
    }
  }

  function toggleReason(reasonCode: FeedbackReasonCode) {
    setReasonCodes((current) =>
      current.includes(reasonCode)
        ? current.filter((item) => item !== reasonCode)
        : [...current, reasonCode],
    );
    setValidationError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!action) {
      setValidationError("Selecciona una respuesta antes de guardar.");
      return;
    }

    if (actionRequiresReasons(action) && reasonCodes.length === 0) {
      setValidationError("Selecciona al menos un motivo.");
      return;
    }

    setValidationError(null);
    await onSave({
      profileId,
      action,
      reasonCodes: actionRequiresReasons(action) ? reasonCodes : [],
      notes: notes.trim() || undefined,
    });
  }

  const isSaving = saveState.status === "saving";
  const responseSummary = action ? feedbackActionLabels[action] : "Completar";
  const availableReasonCodes = action === "should_have_been_shown"
    ? positiveFeedbackReasonCodes
    : negativeFeedbackReasonCodes;

  return (
    <form onSubmit={handleSubmit}>
      <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow open:shadow-md">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-slate-900 sm:px-4">
          <span>Tu respuesta</span>
          <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500">
            <span className="truncate">{responseSummary}</span>
            <span aria-hidden="true" className="text-base transition-transform group-open:rotate-180">
              ⌄
            </span>
          </span>
        </summary>
        <fieldset className="space-y-3 border-t border-slate-200 bg-slate-50/50 p-3 sm:p-4" disabled={isSaving}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {feedbackActions.map((option) => (
              <label
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                  action === option
                    ? "border-teal-700 bg-teal-50 text-teal-900"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
                key={option}
              >
                <input
                  checked={action === option}
                  className="accent-teal-700"
                  name={`${formId}-action`}
                  onChange={() => selectAction(option)}
                  type="radio"
                  value={option}
                />
                {feedbackActionLabels[option]}
              </label>
            ))}
          </div>

          {actionRequiresReasons(action) ? (
            <fieldset
              aria-describedby={validationError ? `${formId}-validation` : undefined}
              className="rounded-md border border-amber-200 bg-amber-50 p-3"
            >
              <legend className="px-1 text-sm font-medium text-amber-950">
                Motivo obligatorio
              </legend>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {availableReasonCodes.map((reasonCode) => (
                  <label className="flex items-start gap-2 text-sm text-slate-800" key={reasonCode}>
                    <input
                      checked={reasonCodes.includes(reasonCode)}
                      className="mt-0.5 accent-teal-700"
                      onChange={() => toggleReason(reasonCode)}
                      type="checkbox"
                    />
                    <span>{feedbackReasonLabels[reasonCode]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="block text-sm font-medium text-slate-700">
            Notas opcionales
            <textarea
              className="mt-1.5 min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              maxLength={1000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Agrega un detalle que quieras recordar"
              value={notes}
            />
          </label>
        </fieldset>

        {validationError ? (
          <p className="mx-3 mt-3 text-sm font-medium text-red-700 sm:mx-4" id={`${formId}-validation`} role="alert">
            {validationError}
          </p>
        ) : null}

        {saveState.status === "success" ? (
          <p className="mx-3 mt-3 text-sm font-medium text-emerald-700 sm:mx-4" role="status">
            Respuesta guardada. Puedes editarla cuando quieras.
          </p>
        ) : null}

        {saveState.status === "error" ? (
          <div className="mx-3 mt-3 text-sm text-red-700 sm:mx-4" role="alert">
            <p className="font-medium">{saveState.error.message}</p>
            {saveState.error.requestId ? (
              <p className="mt-1 text-xs">ID de solicitud: {saveState.error.requestId}</p>
            ) : null}
          </div>
        ) : null}

        <button
          className="mx-3 mb-3 mt-3 min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-white hover:shadow disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:mx-4 sm:mb-4"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Guardando respuesta…" : feedback ? "Actualizar respuesta" : "Guardar respuesta"}
        </button>
      </details>
    </form>
  );
}
