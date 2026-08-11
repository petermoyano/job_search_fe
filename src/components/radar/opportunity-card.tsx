import { FeedbackForm, type FeedbackSaveState } from "./feedback-form";
import {
  eligibilityCriterionLabels,
  eligibilityStatusLabels,
  getFactBadges,
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
  reject: "border-slate-200 bg-slate-100 text-slate-700",
};

const eligibilityStatusStyles = {
  pass: "text-emerald-700",
  fail: "text-red-700",
  unknown: "text-slate-600",
} as const;

export function OpportunityCard({
  opportunity,
  saveState,
  onSaveFeedback,
}: OpportunityCardProps) {
  const factBadges = getFactBadges(opportunity);
  const hasSeparateOriginalUrl =
    opportunity.originalUrl && opportunity.applicationUrl !== opportunity.originalUrl;

  return (
    <article className="flex h-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {opportunity.verdict ? (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${verdictStyles[opportunity.verdict]}`}
          >
            {verdictBadgeLabels[opportunity.verdict]}
          </span>
        ) : null}
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {opportunity.sourceLabel}
        </span>
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
          {opportunity.title}
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

      {opportunity.eligibilityChecks.length > 0 ? (
        <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            Criterios verificados
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {opportunity.eligibilityChecks.map((check, index) => (
              <li className="flex items-start justify-between gap-3" key={`${check.criterion}-${index}`}>
                <span className="text-slate-700">
                  {eligibilityCriterionLabels[check.criterion] ?? "Criterio adicional"}
                </span>
                <span className={`shrink-0 font-semibold ${eligibilityStatusStyles[check.status]}`}>
                  {eligibilityStatusLabels[check.status]}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {opportunity.applicationUrl ? (
          <a
            className="inline-flex min-h-10 items-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            href={opportunity.applicationUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Postularme
          </a>
        ) : (
          <span className="text-sm font-medium text-amber-800">
            No hay un enlace de postulación verificado.
          </span>
        )}

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
