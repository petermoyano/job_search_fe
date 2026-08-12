"use client";

import { useEffect, useId, useState } from "react";
import { translateStopReason } from "@/lib/radar/presentation";
import type { ProfileSource, RadarRunResponse } from "@/lib/radar/types";

export type SearchActivityStatus = "searching" | "completed" | "failed";

type SearchActivityPanelProps = {
  status: SearchActivityStatus;
  startedAt: number;
  finishedAt?: number;
  plannedSources: ProfileSource[];
  maxResults?: number;
  run?: RadarRunResponse;
};

const processTasks = [
  "Consultar las fuentes configuradas en orden.",
  "Abrir las páginas de las ofertas y sus enlaces de postulación.",
  "Verificar modalidad, ubicación, idioma, seniority y vigencia.",
  "Comparar con oportunidades presentadas anteriormente.",
  "Ordenar y preparar los resultados para mostrar.",
];

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusCopy(status: SearchActivityStatus) {
  switch (status) {
    case "completed":
      return {
        title: "Búsqueda finalizada",
        description: "Los resultados ya están listos para revisar.",
        symbol: "✓",
        symbolClass: "bg-emerald-100 text-emerald-800",
      };
    case "failed":
      return {
        title: "Búsqueda interrumpida",
        description: "No pudimos completar el proceso.",
        symbol: "!",
        symbolClass: "bg-red-100 text-red-800",
      };
    default:
      return {
        title: "Buscando oportunidades",
        description: "Consultando, verificando y evaluando oportunidades.",
        symbol: "",
        symbolClass: "bg-teal-600 motion-safe:animate-pulse",
      };
  }
}

export function SearchActivityPanel({
  status,
  startedAt,
  finishedAt,
  plannedSources,
  maxResults,
  run,
}: SearchActivityPanelProps) {
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(true);
  const [now, setNow] = useState(() => finishedAt ?? Date.now());

  useEffect(() => {
    if (status !== "searching") return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  const elapsedSeconds = Math.max(
    0,
    Math.floor(((status === "searching" ? now : finishedAt ?? now) - startedAt) / 1000),
  );
  const copy = statusCopy(status);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left sm:px-5"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${copy.symbolClass}`}
          >
            {copy.symbol}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-semibold text-slate-950">{copy.title}</span>
              <span className="font-mono text-sm tabular-nums text-slate-500">
                {formatDuration(elapsedSeconds)}
              </span>
            </span>
            <span className="mt-1 block text-sm leading-5 text-slate-600">
              {copy.description}
            </span>
          </span>
        </span>
        <span aria-hidden="true" className="text-xl leading-6 text-slate-500">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      <p aria-live="polite" className="sr-only">
        {status === "searching"
          ? "La búsqueda y verificación están en curso."
          : status === "completed"
            ? "La búsqueda finalizó y los resultados están listos."
            : "La búsqueda se interrumpió."}
      </p>

      {isOpen ? (
        <div className="border-t border-slate-200 px-4 py-4 sm:px-5" id={contentId}>
          {status === "searching" ? (
            <SearchingActivity
              elapsedSeconds={elapsedSeconds}
              maxResults={maxResults}
              plannedSources={plannedSources}
            />
          ) : null}
          {status === "completed" && run ? (
            <CompletedActivity plannedSources={plannedSources} run={run} />
          ) : null}
          {status === "failed" ? <FailedActivity /> : null}
        </div>
      ) : null}
    </section>
  );
}

function SearchingActivity({
  elapsedSeconds,
  plannedSources,
  maxResults,
}: {
  elapsedSeconds: number;
  plannedSources: ProfileSource[];
  maxResults?: number;
}) {
  const waitingMessage =
    elapsedSeconds >= 120
      ? "La búsqueda sigue activa. Algunas fuentes o páginas pueden tardar más en responder."
      : elapsedSeconds >= 45
        ? "Abrir y verificar las páginas individuales suele ser la parte más lenta del proceso."
        : undefined;

  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
        <li className="flex items-center gap-3 text-slate-700">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800"
          >
            ✓
          </span>
          <span>Solicitud enviada</span>
        </li>
        <li className="flex items-center gap-3 font-medium text-slate-950">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full bg-teal-600 motion-safe:animate-pulse"
          />
          <span>Búsqueda y verificación en curso</span>
        </li>
      </ol>

      <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
        <span className="rounded-full bg-slate-100 px-3 py-1.5">
          {plannedSources.length > 0
            ? `${plannedSources.length} fuentes previstas`
            : "Fuentes configuradas"}
        </span>
        {maxResults ? (
          <span className="rounded-full bg-slate-100 px-3 py-1.5">
            Hasta {maxResults} oportunidades nuevas
          </span>
        ) : null}
      </div>

      {waitingMessage ? (
        <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-5 text-sky-950">
          {waitingMessage}
        </p>
      ) : null}

      <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Qué incluye este proceso
        </summary>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {processTasks.map((task) => (
            <li className="flex items-start gap-2" key={task}>
              <span aria-hidden="true" className="mt-1 text-slate-400">•</span>
              <span>{task}</span>
            </li>
          ))}
        </ul>
      </details>

      {plannedSources.length > 0 ? (
        <details className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            Fuentes previstas ({plannedSources.length})
          </summary>
          <ol className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
            {plannedSources.map((source, index) => (
              <li key={source.id}>
                <span className="mr-2 text-slate-400">{index + 1}.</span>
                {source.label}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

function CompletedActivity({
  run,
  plannedSources,
}: {
  run: RadarRunResponse;
  plannedSources: ProfileSource[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-700">
        Se consultaron <strong>{run.sourceSummaries.length}</strong>
        {plannedSources.length > 0 ? ` de ${plannedSources.length}` : ""} fuentes y se procesaron{" "}
        <strong>{run.totalUnique}</strong> resultados únicos.
      </p>

      {run.sourceSummaries.length > 0 ? (
        <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            Ver actividad por fuente
          </summary>
          <ul className="mt-3 divide-y divide-slate-200">
            {run.sourceSummaries.map((source) => {
              const stopReason = translateStopReason(source.stopReason, source.continuedToNext);
              return (
                <li className="py-3 first:pt-0 last:pb-0" key={source.sourceId}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-sm font-semibold text-slate-900">{source.sourceLabel}</span>
                    {stopReason ? <span className="text-xs text-slate-500">{stopReason}</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {source.rawCount} encontrados · {source.uniqueCount} únicos ·{" "}
                    {source.qualifiedCount} válidos · {source.newQualifiedCount} nuevos
                  </p>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function FailedActivity() {
  return (
    <ol className="space-y-3 text-sm">
      <li className="flex items-center gap-3 text-slate-700">
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800"
        >
          ✓
        </span>
        <span>Solicitud enviada</span>
      </li>
      <li className="flex items-center gap-3 font-medium text-red-800">
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold"
        >
          !
        </span>
        <span>El servidor no pudo completar la búsqueda</span>
      </li>
    </ol>
  );
}
