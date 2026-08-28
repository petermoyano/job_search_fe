"use client";

import { verdictBadgeLabels } from "@/lib/radar/presentation";
import type { OpportunityCardModel, Verdict } from "@/lib/radar/types";

type OpportunityCardProps = {
  opportunity: OpportunityCardModel;
  isDeleting: boolean;
  onSoftDelete: (opportunity: OpportunityCardModel) => void;
};

const verdictStyles: Record<Verdict, string> = {
  promising: "border-emerald-200 bg-emerald-50 text-emerald-800",
  maybe: "border-amber-200 bg-amber-50 text-amber-900",
  reject: "border-red-200 bg-red-50 text-red-700 shadow-sm",
};

export function OpportunityCard({
  opportunity,
  isDeleting,
  onSoftDelete,
}: OpportunityCardProps) {
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

      <div className="mt-auto flex justify-end">
        <button
          aria-label={`Ocultar ${opportunity.title}`}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={isDeleting}
          onClick={() => onSoftDelete(opportunity)}
          type="button"
        >
          {isDeleting ? "Ocultando…" : "Ocultar"}
        </button>
      </div>
    </article>
  );
}
