"use client";

import { useId } from "react";
import { FeedbackForm, type FeedbackSaveState } from "./feedback-form";
import {
  eligibilityCriterionLabels,
  eligibilityStatusLabels,
  getEvaluationReasons,
  getFactBadges,
  translateEligibilityReason,
  verdictBadgeLabels,
} from "@/lib/radar/presentation";
import type { FeedbackInput, OpportunityCardModel, Verdict } from "@/lib/radar/types";

type OpportunityCardProps = {
  opportunity: OpportunityCardModel;
  saveState: FeedbackSaveState;
  onSaveFeedback: (opportunityId: string, input: FeedbackInput) => Promise<void>;
};

const verdictStyles: Record<Verdict, string> = {
  promising: "border-emerald-200 bg-emerald-50 text-emerald-800",
  maybe: "border-amber-200 bg-amber-50 text-amber-900",
  reject: "border-red-200 bg-red-50 text-red-700 shadow-sm",
};

const eligibilityStatusStyles = {
  pass: "text-emerald-700",
  fail: "text-red-700",
  unknown: "text-slate-600",
} as const;

export function EvaluationDetails({ opportunity }: { opportunity: OpportunityCardModel }) {
  const tooltipId = useId();
  const reasons =
    opportunity.verdict === "promising" && opportunity.presented !== false
      ? []
      : getEvaluationReasons(opportunity);

  if (reasons.length === 0 && opportunity.eligibilityChecks.length === 0) return null;

  const firstCheck = opportunity.eligibilityChecks[0];
  const evaluationPreview =
    reasons[0] ??
    (firstCheck
      ? `${eligibilityCriterionLabels[firstCheck.criterion] ?? "Criterio adicional"}: ${eligibilityStatusLabels[firstCheck.status]}`
      : "Evaluación disponible");

  return (
    <div className="group relative focus-within:z-30 hover:z-30">
      <div
        aria-describedby={tooltipId}
        className="flex cursor-help items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus-visible:border-teal-600 focus-visible:ring-2 focus-visible:ring-teal-100"
        tabIndex={0}
      >
        <span className="block min-w-0 truncate">{evaluationPreview}</span>
      </div>

      <div className="invisible absolute left-0 top-full z-30 w-full min-w-72 pt-2 group-focus-within:visible group-hover:visible">
        <div
          className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
          id={tooltipId}
          role="tooltip"
        >
          {reasons.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Motivos principales
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {opportunity.eligibilityChecks.length > 0 ? (
            <div
              className={reasons.length > 0 ? "mt-4 border-t border-slate-200 pt-3" : undefined}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Criterios verificados
              </p>
              <ul className="mt-2 space-y-3 text-sm">
                {opportunity.eligibilityChecks.map((check, index) => {
                  const reason =
                    check.status === "pass" ? undefined : translateEligibilityReason(check);
                  return (
                    <li key={`${check.criterion}-${index}`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-700">
                          {eligibilityCriterionLabels[check.criterion] ?? "Criterio adicional"}
                        </span>
                        <span
                          className={`shrink-0 font-semibold ${eligibilityStatusStyles[check.status]}`}
                        >
                          {eligibilityStatusLabels[check.status]}
                        </span>
                      </div>
                      {reason ? (
                        <p className="mt-1 text-xs leading-5 text-slate-600">{reason}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OpportunityCard({
  opportunity,
  saveState,
  onSaveFeedback,
}: OpportunityCardProps) {
  const factBadges = getFactBadges(opportunity);
  const hasSeparateOriginalUrl =
    opportunity.originalUrl && opportunity.applicationUrl !== opportunity.originalUrl;

  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)] sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {opportunity.verdict ? (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${verdictStyles[opportunity.verdict]}`}
          >
            {verdictBadgeLabels[opportunity.verdict]}
          </span>
        ) : null}
        {opportunity.sourceAttributionUrl ? (
          <a
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-teal-700 hover:underline"
            href={opportunity.sourceAttributionUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Fuente: {opportunity.sourceLabel}
          </a>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            Fuente: {opportunity.sourceLabel}
          </span>
        )}
        {typeof opportunity.score === "number" ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            Puntaje {opportunity.score}
          </span>
        ) : null}
        {typeof opportunity.roleTier === "number" ? (
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800">
            Tier {opportunity.roleTier}
          </span>
        ) : null}
      </div>

      <div>
        <h3 className="text-base font-semibold leading-6 text-slate-950 sm:text-lg">
          {opportunity.applicationUrl ? (
            <a
              className="cursor-pointer transition hover:text-teal-700 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              href={opportunity.applicationUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {opportunity.title}
            </a>
          ) : (
            opportunity.title
          )}
        </h3>
        {opportunity.companyName || opportunity.locationText ? (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
            {opportunity.companyName ? <span>{opportunity.companyName}</span> : null}
            {opportunity.locationText ? <span>{opportunity.locationText}</span> : null}
          </div>
        ) : null}
      </div>

      {factBadges.length > 0 ? (
        <ul aria-label="Datos verificados" className="flex flex-wrap gap-2">
          {factBadges.map((badge) => (
            <li
              className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900"
              key={badge}
            >
              {badge}
            </li>
          ))}
        </ul>
      ) : null}

      <EvaluationDetails opportunity={opportunity} />

      {!opportunity.applicationUrl || hasSeparateOriginalUrl ? (
        <div className="flex flex-wrap gap-3">
          {!opportunity.applicationUrl ? (
            <span className="text-sm font-medium text-amber-800">
              No hay un enlace de postulación verificado.
            </span>
          ) : null}

          {hasSeparateOriginalUrl ? (
            <a
              className="inline-flex min-h-10 items-center rounded-md border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
              href={opportunity.originalUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Abrir oferta
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto">
        <FeedbackForm
          feedback={opportunity.feedback}
          onSave={(input) => onSaveFeedback(opportunity.id, input)}
          profileId={opportunity.profileId}
          saveState={saveState}
        />
      </div>
    </article>
  );
}
