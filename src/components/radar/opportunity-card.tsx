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
  return (
    <article className="relative flex h-36 min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-2.5 pr-10 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex max-h-11 flex-wrap items-center gap-1.5 overflow-hidden">
        {opportunity.verdict ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 ${verdictStyles[opportunity.verdict]}`}
          >
            {verdictBadgeLabels[opportunity.verdict]}
          </span>
        ) : null}
        {opportunity.sourceAttributionUrl ? (
          <a
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium leading-4 text-slate-700 hover:text-teal-700 hover:underline"
            href={opportunity.sourceAttributionUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Fuente: {opportunity.sourceLabel}
          </a>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium leading-4 text-slate-700">
            Fuente: {opportunity.sourceLabel}
          </span>
        )}
        {typeof opportunity.score === "number" ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium leading-4 text-slate-700">
            Puntaje {opportunity.score}
          </span>
        ) : null}
        {typeof opportunity.roleTier === "number" ? (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium leading-4 text-indigo-800">
            Tier {opportunity.roleTier}
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950 sm:text-base">
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
          <div className="mt-0.5 flex min-w-0 gap-x-2 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-600">
            {opportunity.companyName ? <span>{opportunity.companyName}</span> : null}
            {opportunity.locationText ? <span>{opportunity.locationText}</span> : null}
          </div>
        ) : null}
      </div>

      <button
        aria-label="Ocultar oportunidad"
        className="absolute bottom-2.5 right-2.5 inline-flex size-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:text-slate-400"
        disabled={isDeleting}
        onClick={() => onSoftDelete(opportunity)}
        title={isDeleting ? "Ocultando..." : "Ocultar oportunidad"}
        type="button"
      >
        <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" />
        </svg>
      </button>
    </article>
  );
}
