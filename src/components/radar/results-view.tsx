"use client";

import { useId, useState } from "react";
import { EvaluationDetails, OpportunityCard } from "./opportunity-card";
import type { FeedbackSaveState } from "./feedback-form";
import {
  exclusionKindLabels,
  getEvaluationReasons,
  getExclusionKind,
  historyOpportunityToCard,
  translateStopReason,
  type ExclusionKind,
} from "@/lib/radar/presentation";
import type {
  FeedbackInput,
  HistoryOpportunity,
  OpportunityCardModel,
  RadarRunResponse,
  RequestError,
  SourceSummary,
} from "@/lib/radar/types";

export type DirectLink = {
  id: string;
  title: string;
  url: string;
};

export type CopyStatus = "idle" | "copied" | "error";
export type HistoryView = "presented" | "excluded";

type SaveStateMap = Record<string, FeedbackSaveState>;

export function ErrorNotice({ error }: { error: RequestError }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <p className="font-semibold">{error.message}</p>
      {error.requestId ? <p className="mt-1 text-xs">ID de solicitud: {error.requestId}</p> : null}
    </div>
  );
}

export function ResultsSummary({ run }: { run: RadarRunResponse }) {
  return (
    <section aria-label="Resumen de la búsqueda" className="border-y border-slate-200 bg-white py-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryItem label="Mostradas" value={run.items.length} />
        <SummaryItem label="Nuevas válidas" value={run.totalNew} />
        <SummaryItem label="Coincidencias válidas" value={run.totalQualified} />
        <SummaryItem label="No mostradas" value={run.totalExcluded} />
        <SummaryItem label="Fuentes consultadas" value={run.sourceSummaries.length} />
      </div>

      <details className="mt-5 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-700">Detalles técnicos</summary>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <span>Resultados crudos: {run.totalRaw}</span>
          <span>Resultados únicos: {run.totalUnique}</span>
          <span>Versión del perfil: {run.profileVersion}</span>
        </div>
      </details>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase leading-5 text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function SourcesConsulted({ sources }: { sources: SourceSummary[] }) {
  return (
    <details className="rounded-md border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900 sm:px-5">
        Fuentes consultadas ({sources.length})
      </summary>

      {sources.length === 0 ? (
        <p className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:px-5">
          El backend no informó fuentes para esta búsqueda.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 border-t border-slate-200">
          {sources.map((source) => (
            <li className="px-4 py-4 sm:px-5" key={source.sourceId}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <p className="font-semibold text-slate-900">{source.sourceLabel}</p>
                {translateStopReason(source.stopReason, source.continuedToNext) ? (
                  <p className="text-sm text-slate-600">
                    {translateStopReason(source.stopReason, source.continuedToNext)}
                  </p>
                ) : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                <SourceCount label="Crudos" value={source.rawCount} />
                <SourceCount label="Únicos" value={source.uniqueCount} />
                <SourceCount label="Válidos" value={source.qualifiedCount} />
                <SourceCount label="Nuevos" value={source.newQualifiedCount} />
                <SourceCount label="Filtrados" value={source.excludedCount} />
              </dl>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function SourceCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

export function OpportunityGroup({
  title,
  opportunities,
  emptyMessage,
  saveStates,
  onSaveFeedback,
}: {
  title: string;
  opportunities: OpportunityCardModel[];
  emptyMessage?: string;
  saveStates: SaveStateMap;
  onSaveFeedback: (opportunityId: string, input: FeedbackInput) => Promise<void>;
}) {
  return (
    <section aria-labelledby={`group-${slugify(title)}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-950" id={`group-${slugify(title)}`}>
          {title}
        </h2>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
          {opportunities.length}
        </span>
      </div>

      {opportunities.length === 0 ? (
        <p className="border-y border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
          {emptyMessage ?? "Sin resultados en esta categoría."}
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              onSaveFeedback={onSaveFeedback}
              opportunity={opportunity}
              saveState={saveStates[opportunity.id] ?? { status: "idle" }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function slugify(value: string): string {
  return value.toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, "-");
}

const exclusionKindStyles: Record<ExclusionKind, string> = {
  already_seen: "border-sky-200 bg-sky-50 text-sky-800",
  overflow: "border-indigo-200 bg-indigo-50 text-indigo-800",
  unverified: "border-amber-200 bg-amber-50 text-amber-900",
  rejected: "border-slate-200 bg-slate-100 text-slate-700",
};

export function ExcludedResultsPanel({
  opportunities,
  initiallyOpen,
}: {
  opportunities: OpportunityCardModel[];
  initiallyOpen: boolean;
}) {
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [visibleCount, setVisibleCount] = useState(10);
  const visibleOpportunities = opportunities.slice(0, visibleCount);
  const remainingCount = opportunities.length - visibleOpportunities.length;

  if (opportunities.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-300 bg-white" id="excluded-results">
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left sm:px-5"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-slate-950">Resultados no mostrados</span>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-semibold text-slate-700">
              {opportunities.length}
            </span>
          </span>
          <span className="mt-1 block text-sm leading-5 text-slate-600">
            Incluye ofertas que no cumplieron algún criterio, no pudieron verificarse, ya habían sido vistas o quedaron fuera del cupo.
          </span>
        </span>
        <span aria-hidden="true" className="mt-0.5 text-xl text-slate-500">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-200" id={contentId}>
          <ol className="divide-y divide-slate-200">
            {visibleOpportunities.map((opportunity) => (
              <ExcludedOpportunityRow key={opportunity.id} opportunity={opportunity} />
            ))}
          </ol>

          {remainingCount > 0 ? (
            <div className="border-t border-slate-200 px-4 py-3 sm:px-5">
              <button
                className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={() => setVisibleCount((count) => count + 10)}
                type="button"
              >
                Mostrar {Math.min(10, remainingCount)} más
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ExcludedOpportunityRow({ opportunity }: { opportunity: OpportunityCardModel }) {
  const exclusionKind = getExclusionKind(opportunity);
  const reasons = getEvaluationReasons(opportunity).slice(0, 2);
  const link = opportunity.originalUrl ?? opportunity.applicationUrl;

  return (
    <li className="px-4 py-4 sm:px-5">
      <article className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${exclusionKindStyles[exclusionKind]}`}
            >
              {exclusionKindLabels[exclusionKind]}
            </span>
            <span className="text-xs font-medium text-slate-500">{opportunity.sourceLabel}</span>
          </div>
          <h3 className="mt-2 font-semibold text-slate-950">{opportunity.title}</h3>
          {opportunity.companyName || opportunity.locationText ? (
            <p className="mt-1 text-sm text-slate-600">
              {[opportunity.companyName, opportunity.locationText].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {reasons.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 max-w-2xl">
            <EvaluationDetails opportunity={opportunity} />
          </div>
        </div>

        {link ? (
          <a
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
            href={link}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir oferta
          </a>
        ) : (
          <span className="text-sm font-medium text-amber-800">Enlace no disponible</span>
        )}
      </article>
    </li>
  );
}

export function HistoryPanel({
  isOpen,
  onToggle,
  isLoading,
  error,
  presentedHistory,
  excludedHistory,
  historyView,
  onHistoryViewChange,
  selectedProfileId,
  currentOpportunityIds,
  saveStates,
  onRefresh,
  onSaveFeedback,
}: {
  isOpen: boolean;
  onToggle: () => void;
  isLoading: boolean;
  error: RequestError | null;
  presentedHistory: HistoryOpportunity[] | null;
  excludedHistory: HistoryOpportunity[] | null;
  historyView: HistoryView;
  onHistoryViewChange: (view: HistoryView) => void;
  selectedProfileId: string;
  currentOpportunityIds: Set<string>;
  saveStates: SaveStateMap;
  onRefresh: () => void;
  onSaveFeedback: (opportunityId: string, input: FeedbackInput) => Promise<void>;
}) {
  const historyIsLoaded = presentedHistory !== null && excludedHistory !== null;
  const selectedHistory =
    historyView === "presented" ? presentedHistory ?? [] : excludedHistory ?? [];
  const visibleHistory = selectedHistory.filter((item) => !currentOpportunityIds.has(item.id));
  const emptyMessage =
    historyView === "presented"
      ? "Todavía no hay oportunidades presentadas en el historial de este perfil."
      : "Todavía no hay resultados no mostrados en el historial de este perfil.";

  return (
    <section aria-labelledby="history-heading" className="border-t border-slate-200 pt-5">
      <button
        aria-controls="history-content"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <span>
          <span className="block text-xl font-semibold text-slate-950" id="history-heading">
            Historial
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            Consulta oportunidades presentadas y resultados no mostrados de búsquedas anteriores.
          </span>
        </span>
        <span aria-hidden="true" className="text-xl text-slate-500">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-5 space-y-4" id="history-content">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              aria-label="Tipo de historial"
              className="inline-flex w-fit rounded-md border border-slate-300 bg-slate-100 p-1"
            >
              <HistoryViewButton
                count={presentedHistory?.length ?? 0}
                isActive={historyView === "presented"}
                label="Presentadas"
                onClick={() => onHistoryViewChange("presented")}
              />
              <HistoryViewButton
                count={excludedHistory?.length ?? 0}
                isActive={historyView === "excluded"}
                label="No mostradas"
                onClick={() => onHistoryViewChange("excluded")}
              />
            </div>
            <button
              className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={isLoading}
              onClick={onRefresh}
              type="button"
            >
              {isLoading ? "Actualizando…" : "Actualizar historial"}
            </button>
          </div>

          {error ? <ErrorNotice error={error} /> : null}

          {isLoading && !historyIsLoaded ? (
            <p className="border-y border-slate-200 bg-white px-4 py-5 text-sm text-slate-600" role="status">
              Cargando historial…
            </p>
          ) : null}

          {!isLoading && !error && historyIsLoaded && selectedHistory.length === 0 ? (
            <p className="border-y border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
              {emptyMessage}
            </p>
          ) : null}

          {!isLoading && !error && selectedHistory.length > 0 && visibleHistory.length === 0 ? (
            <p className="border-y border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
              Estas oportunidades ya aparecen en los resultados actuales.
            </p>
          ) : null}

          {visibleHistory.length > 0 ? (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {visibleHistory.map((item) => {
                const opportunity = historyOpportunityToCard(item, selectedProfileId);
                return (
                  <OpportunityCard
                    key={opportunity.id}
                    onSaveFeedback={onSaveFeedback}
                    opportunity={opportunity}
                    saveState={saveStates[opportunity.id] ?? { status: "idle" }}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function HistoryViewButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isActive}
      className={`min-h-9 rounded px-3 py-1.5 text-sm font-semibold transition ${
        isActive ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"
      }`}
      onClick={onClick}
      type="button"
    >
      {label} ({count})
    </button>
  );
}

export function DirectLinksList({
  links,
  copyStatus,
  onCopy,
}: {
  links: DirectLink[];
  copyStatus: CopyStatus;
  onCopy: () => void;
}) {
  return (
    <section aria-labelledby="direct-links-heading" className="border-t border-slate-200 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950" id="direct-links-heading">
            Enlaces directos
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Incluye solamente las oportunidades visibles que siguen siendo relevantes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span aria-live="polite" className="text-sm font-medium">
            {copyStatus === "copied" ? (
              <span className="text-emerald-700">Copiado</span>
            ) : null}
            {copyStatus === "error" ? (
              <span className="text-red-700">No se pudo copiar</span>
            ) : null}
          </span>
          <button
            className="min-h-10 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={links.length === 0}
            onClick={onCopy}
            type="button"
          >
            Copiar todos
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <p className="mt-4 border-y border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
          No hay enlaces relevantes para copiar.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-slate-200 border-y border-slate-200 bg-white text-sm">
          {links.map((link, index) => (
            <li className="px-4 py-3" key={link.id}>
              <p className="font-medium text-slate-950">
                {index + 1}. {link.title}
              </p>
              <a
                className="mt-1 block text-teal-800 hover:underline"
                href={link.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.url}
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
