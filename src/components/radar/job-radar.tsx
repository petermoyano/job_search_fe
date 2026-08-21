"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { FeedbackSaveState } from "./feedback-form";
import {
  SearchActivityPanel,
  type SearchActivityStatus,
} from "./search-activity-panel";
import {
  DirectLinksList,
  ErrorNotice,
  ExcludedResultsPanel,
  HistoryPanel,
  OpportunityGroup,
  ResultsSummary,
  type CopyStatus,
  type HistoryView,
} from "./results-view";
import {
  getHistory,
  getProfiles,
  runRadar,
  saveOpportunityFeedback,
  toRequestError,
} from "@/lib/radar/api";
import {
  currentOpportunityToCard,
  fallbackProfiles,
  limitOptions,
  primaryProfileId,
  verdictLabels,
} from "@/lib/radar/presentation";
import type {
  FeedbackInput,
  HistoryOpportunity,
  ProfileOption,
  RadarRunResponse,
  RequestError,
  Verdict,
} from "@/lib/radar/types";

type LimitOption = (typeof limitOptions)[number];

const verdictOrder: Verdict[] = ["promising", "maybe", "reject"];

function mergeProfiles(apiProfiles: ProfileOption[]): ProfileOption[] {
  const profiles = new Map<string, ProfileOption>();
  [...fallbackProfiles, ...apiProfiles].forEach((profile) => profiles.set(profile.id, profile));
  return Array.from(profiles.values());
}

function parseLimit(value: string): LimitOption | undefined {
  const parsed = Number(value);
  if (parsed === 10 || parsed === 25 || parsed === 50) return parsed;
  return undefined;
}

function emptySearchMessage(run: RadarRunResponse): string {
  if (run.totalQualified === 0) {
    return "No encontramos vacantes que cumplan todos los filtros obligatorios.";
  }

  if (run.totalQualified > 0 && run.totalNew === 0) {
    return "No hay oportunidades nuevas; las coincidencias encontradas ya habían sido presentadas anteriormente.";
  }

  return "La búsqueda terminó sin oportunidades nuevas para mostrar.";
}

export function JobRadar() {
  const [profiles, setProfiles] = useState<ProfileOption[]>(fallbackProfiles);
  const [profileLoadError, setProfileLoadError] = useState<RequestError | null>(null);
  const [selectedProfile, setSelectedProfile] = useState(primaryProfileId);
  const [limit, setLimit] = useState<LimitOption>(25);
  const [currentRun, setCurrentRun] = useState<RadarRunResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<RequestError | null>(null);
  const [searchTiming, setSearchTiming] = useState<{
    startedAt: number;
    finishedAt?: number;
  } | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [presentedHistory, setPresentedHistory] = useState<HistoryOpportunity[] | null>(null);
  const [excludedHistory, setExcludedHistory] = useState<HistoryOpportunity[] | null>(null);
  const [historyError, setHistoryError] = useState<RequestError | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyView, setHistoryView] = useState<HistoryView>("presented");
  const [feedbackSaveStates, setFeedbackSaveStates] = useState<
    Record<string, FeedbackSaveState>
  >({});

  const isPrimaryProfile = selectedProfile === primaryProfileId;
  const selectedProfileOption = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfile),
    [profiles, selectedProfile],
  );
  const plannedSources = selectedProfileOption?.orderedSources ?? [];
  const maxResults =
    selectedProfileOption?.maxQualifiedResults ?? (isPrimaryProfile ? 5 : limit);
  const searchActivityStatus: SearchActivityStatus | null = isSearching
    ? "searching"
    : currentRun
      ? "completed"
      : searchError && searchTiming
        ? "failed"
        : null;

  useEffect(() => {
    const controller = new AbortController();

    getProfiles(controller.signal)
      .then((apiProfiles) => {
        if (apiProfiles.length > 0) setProfiles(mergeProfiles(apiProfiles));
        setProfileLoadError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProfileLoadError(
          toRequestError(error, "No pudimos actualizar los perfiles disponibles."),
        );
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsHistoryLoading(true);
    setHistoryError(null);

    Promise.all([
      getHistory(selectedProfile, {
        limit: 200,
        signal: controller.signal,
      }),
      getHistory(selectedProfile, {
        includeExcluded: true,
        limit: 200,
        signal: controller.signal,
      }),
    ])
      .then(([presentedItems, allItems]) => {
        setPresentedHistory(presentedItems);
        setExcludedHistory(
          allItems.filter((item) => item.latestEvaluation?.presented === false),
        );
        setHistoryError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHistoryError(toRequestError(error, "No pudimos cargar el historial."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsHistoryLoading(false);
      });

    return () => controller.abort();
  }, [historyRefreshKey, selectedProfile]);

  const visibleItems = useMemo(() => {
    if (!currentRun) return [];
    if (!isPrimaryProfile) return currentRun.items;

    return currentRun.items.filter(
      (item) => item.isNew && item.classification.eligible === true,
    );
  }, [currentRun, isPrimaryProfile]);

  const currentCards = useMemo(
    () =>
      visibleItems.map((item) =>
        currentOpportunityToCard(item, currentRun?.profileId ?? selectedProfile),
      ),
    [currentRun?.profileId, selectedProfile, visibleItems],
  );

  const excludedCards = useMemo(
    () =>
      (currentRun?.excludedItems ?? []).map((item) =>
        currentOpportunityToCard(
          item,
          currentRun?.profileId ?? selectedProfile,
          false,
        ),
      ),
    [currentRun?.excludedItems, currentRun?.profileId, selectedProfile],
  );

  const currentOpportunityIds = useMemo(
    () => new Set([...currentCards, ...excludedCards].map((item) => item.id)),
    [currentCards, excludedCards],
  );

  const groupedCards = useMemo(
    () => ({
      promising: currentCards.filter((item) => item.verdict === "promising"),
      maybe: currentCards.filter((item) => item.verdict === "maybe"),
      reject: currentCards.filter((item) => item.verdict === "reject"),
    }),
    [currentCards],
  );

  const directLinks = useMemo(
    () =>
      visibleItems.flatMap((item) => {
        const card = currentOpportunityToCard(item, currentRun?.profileId ?? selectedProfile);
        if (
          !item.classification.eligible ||
          item.feedback?.action === "not_relevant" ||
          !card.applicationUrl
        ) {
          return [];
        }

        return [{ id: item.opportunityId, title: item.candidate.title, url: card.applicationUrl }];
      }),
    [currentRun?.profileId, selectedProfile, visibleItems],
  );

  function handleProfileChange(nextProfileId: string) {
    if (nextProfileId === selectedProfile) return;

    setSelectedProfile(nextProfileId);
    setCurrentRun(null);
    setHasSearched(false);
    setSearchError(null);
    setSearchTiming(null);
    setCopyStatus("idle");
    setPresentedHistory(null);
    setExcludedHistory(null);
    setHistoryError(null);
    setHistoryView("presented");
    setFeedbackSaveStates({});
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSearching) return;

    setHasSearched(true);
    setIsSearching(true);
    setSearchError(null);
    setCurrentRun(null);
    setSearchTiming({ startedAt: Date.now() });
    setCopyStatus("idle");

    try {
      const run = await runRadar({
        profileId: selectedProfile,
        limit: isPrimaryProfile ? 25 : limit,
      });

      if (run.profileId !== selectedProfile) {
        setSearchError({
          message: "El servidor respondió con resultados de otro perfil. No los mostraremos.",
        });
        return;
      }

      setCurrentRun(run);
      setHistoryRefreshKey((value) => value + 1);
    } catch (error) {
      setSearchError(toRequestError(error, "No pudimos completar la búsqueda."));
    } finally {
      setIsSearching(false);
      setSearchTiming((timing) =>
        timing ? { ...timing, finishedAt: Date.now() } : timing,
      );
    }
  }

  async function handleSaveFeedback(opportunityId: string, input: FeedbackInput) {
    setFeedbackSaveStates((current) => ({
      ...current,
      [opportunityId]: { status: "saving" },
    }));

    try {
      const savedFeedback = await saveOpportunityFeedback(opportunityId, input);

      setCurrentRun((run) =>
        run
          ? {
              ...run,
              items: run.items.map((item) =>
                item.opportunityId === opportunityId
                  ? { ...item, feedback: savedFeedback }
                  : item,
              ),
              excludedItems: run.excludedItems.map((item) =>
                item.opportunityId === opportunityId
                  ? { ...item, feedback: savedFeedback }
                  : item,
              ),
            }
          : run,
      );
      setPresentedHistory((items) =>
        items?.map((item) =>
          item.id === opportunityId ? { ...item, feedback: savedFeedback } : item,
        ) ?? null,
      );
      setExcludedHistory((items) =>
        items?.map((item) =>
          item.id === opportunityId ? { ...item, feedback: savedFeedback } : item,
        ) ?? null,
      );
      setFeedbackSaveStates((current) => ({
        ...current,
        [opportunityId]: { status: "success" },
      }));
      setCopyStatus("idle");
    } catch (error) {
      setFeedbackSaveStates((current) => ({
        ...current,
        [opportunityId]: {
          status: "error",
          error: toRequestError(error, "No pudimos guardar tu respuesta."),
        },
      }));
    }
  }

  async function handleCopyAllLinks() {
    if (directLinks.length === 0) return;

    const text = directLinks.map((link) => link.url).join("\n");

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium uppercase text-teal-700">Job Radar</p>
              <Link className="text-sm font-semibold text-teal-700 underline" href="/mi-perfil">
                Mi perfil
              </Link>
            </div>
            <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
              Búsqueda manual de oportunidades
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Elige un perfil y comienza la búsqueda cuando estés lista.
            </p>
          </div>

          <form
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,auto)_auto] lg:items-end"
            onSubmit={handleSearch}
          >
            <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700">
              Perfil
              <select
                className="h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                disabled={isSearching}
                onChange={(event) => handleProfileChange(event.target.value)}
                value={selectedProfile}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>

            {isPrimaryProfile ? (
              <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-5 text-sky-950">
                Se revisarán las fuentes configuradas y se mostrarán hasta cinco oportunidades nuevas verificadas.
              </p>
            ) : (
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Límite
                <select
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  disabled={isSearching}
                  onChange={(event) => {
                    const nextLimit = parseLimit(event.target.value);
                    if (nextLimit) setLimit(nextLimit);
                  }}
                  value={limit}
                >
                  {limitOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              aria-busy={isSearching}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSearching}
              type="submit"
            >
              {isSearching ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin"
                  />
                  <span>Buscando…</span>
                </>
              ) : (
                "Buscar oportunidades"
              )}
            </button>
          </form>

          {profileLoadError ? (
            <div className="mt-4 border-t border-amber-200 pt-3 text-xs text-amber-800" role="status">
              <p>Usamos la lista local de perfiles porque no pudimos actualizarla.</p>
              {profileLoadError.requestId ? <p>ID de solicitud: {profileLoadError.requestId}</p> : null}
            </div>
          ) : null}
        </section>

        {searchTiming && searchActivityStatus ? (
          <SearchActivityPanel
            finishedAt={searchTiming.finishedAt}
            maxResults={maxResults}
            plannedSources={plannedSources}
            run={currentRun ?? undefined}
            startedAt={searchTiming.startedAt}
            status={searchActivityStatus}
          />
        ) : null}

        {searchError ? (
          <div className="space-y-2">
            <ErrorNotice error={searchError} />
            <p className="text-sm text-slate-600">
              La búsqueda no se reintentó automáticamente. Para intentar de nuevo, usa el botón de búsqueda.
            </p>
          </div>
        ) : null}

        {currentRun ? (
          <div className="space-y-7">
            <ResultsSummary run={currentRun} />

            {currentRun.invalidItemCount > 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
                Omitimos {currentRun.invalidItemCount} resultado incompleto porque no tenía un identificador estable o datos válidos.
              </p>
            ) : null}

            {currentCards.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-950">
                <p className="font-semibold">{emptySearchMessage(currentRun)}</p>
                {excludedCards.length > 0 ? (
                  <p className="mt-1 leading-6">
                    Puedes revisar los {excludedCards.length} resultados no mostrados y abrir sus enlaces a continuación.
                  </p>
                ) : null}
              </div>
            ) : isPrimaryProfile ? (
              <OpportunityGroup
                onSaveFeedback={handleSaveFeedback}
                opportunities={currentCards}
                saveStates={feedbackSaveStates}
                title="Oportunidades nuevas verificadas"
              />
            ) : (
              <div className="space-y-7">
                {verdictOrder.map((verdict) => (
                  <OpportunityGroup
                    key={verdict}
                    onSaveFeedback={handleSaveFeedback}
                    opportunities={groupedCards[verdict]}
                    saveStates={feedbackSaveStates}
                    title={verdictLabels[verdict]}
                  />
                ))}
              </div>
            )}

            <ExcludedResultsPanel
              key={currentRun.runId}
              initiallyOpen={currentCards.length === 0}
              onSaveFeedback={handleSaveFeedback}
              opportunities={excludedCards}
              saveStates={feedbackSaveStates}
            />
          </div>
        ) : null}

        {!hasSearched && !isSearching ? (
          <p className="text-sm text-slate-500">La búsqueda comenzará únicamente cuando presiones el botón.</p>
        ) : null}

        <HistoryPanel
          currentOpportunityIds={currentOpportunityIds}
          error={historyError}
          excludedHistory={excludedHistory}
          presentedHistory={presentedHistory}
          historyView={historyView}
          isLoading={isHistoryLoading}
          isOpen={isHistoryOpen}
          onHistoryViewChange={setHistoryView}
          onRefresh={() => setHistoryRefreshKey((value) => value + 1)}
          onSaveFeedback={handleSaveFeedback}
          onToggle={() => setIsHistoryOpen((value) => !value)}
          saveStates={feedbackSaveStates}
          selectedProfileId={selectedProfile}
        />

        {currentRun && currentCards.length > 0 ? (
          <DirectLinksList
            copyStatus={copyStatus}
            links={directLinks}
            onCopy={handleCopyAllLinks}
          />
        ) : null}
      </div>
    </main>
  );
}
