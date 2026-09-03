"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  SearchActivityPanel,
  type SearchActivityStatus,
} from "./search-activity-panel";
import { SearchSpinner } from "./search-spinner";
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
  reviewSearchRun,

  softDeleteOpportunity,
  toRequestError,
} from "@/lib/radar/api";
import {
  currentOpportunityToCard,
  fallbackProfiles,
  limitOptions,
  defaultProfileId,
} from "@/lib/radar/presentation";
import type {
  HistoryOpportunity,
  OpportunityCardModel,
  SearchRunReview,

  ProfileOption,
  RadarRunResponse,
  RequestError,
} from "@/lib/radar/types";

type LimitOption = (typeof limitOptions)[number];


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

const PETER_PROFILE_ID = "peter-latam-remote-ai-fullstack-product";

function defaultLimitForProfile(profileId: string): LimitOption {
  return profileId === PETER_PROFILE_ID ? 50 : 25;
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
  const [selectedProfile, setSelectedProfile] = useState(defaultProfileId);
  const [limit, setLimit] = useState<LimitOption>(() =>
    defaultLimitForProfile(defaultProfileId),
  );
  const [currentRun, setCurrentRun] = useState<RadarRunResponse | null>(null);
  const [searchRunReview, setSearchRunReview] = useState<SearchRunReview | null>(null);
  const [isSearchRunReviewing, setIsSearchRunReviewing] = useState(false);
  const [searchRunReviewError, setSearchRunReviewError] = useState<RequestError | null>(null);

  const [qualityReviewEnabled, setQualityReviewEnabled] = useState(false);
  const [isQualityReviewControlVisible, setIsQualityReviewControlVisible] = useState(false);
  const [qualityReviewEnabledForCurrentRun, setQualityReviewEnabledForCurrentRun] = useState(false);
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
  const [deletingOpportunityIds, setDeletingOpportunityIds] = useState<Set<string>>(
    new Set(),
  );
  const [deletedOpportunityIds, setDeletedOpportunityIds] = useState<Set<string>>(
    new Set(),
  );

  const selectedProfileOption = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfile),
    [profiles, selectedProfile],
  );
  const plannedSources = selectedProfileOption?.orderedSources ?? [];
  const maxResults =
    selectedProfileOption?.maxQualifiedResults ?? limit;
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
  useEffect(() => {
    if (!qualityReviewEnabledForCurrentRun || !currentRun) return;

    const opportunityIds = currentRun.items.map((item) => item.opportunityId);
    if (opportunityIds.length === 0) return;

    let cancelled = false;
    let attempts = 0;
    let timeout: number | undefined;
    let controller: AbortController | undefined;

    const refreshReviews = () => {
      controller = new AbortController();
      getHistory(selectedProfile, { limit: 200, signal: controller.signal })
        .then((items) => {
          if (cancelled) return;

          setPresentedHistory(items);
          const reviewsByOpportunity = new Map(
            items.map((item) => [item.id, item.qualityReview]),
          );
          const waitingForReview = opportunityIds.some((id) => {
            const review = reviewsByOpportunity.get(id);
            return !review || review.status !== "completed";
          });

          attempts += 1;
          if (waitingForReview && attempts < 10) {
            timeout = window.setTimeout(refreshReviews, 3_000);
          }
        })
        .catch(() => undefined);
    };

    timeout = window.setTimeout(refreshReviews, 1_500);
    return () => {
      cancelled = true;
      controller?.abort();
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [currentRun, qualityReviewEnabledForCurrentRun, selectedProfile]);


  const visibleItems = (currentRun?.items ?? []).filter(
    (item) => !deletedOpportunityIds.has(item.opportunityId),
  );
  const visibleExcludedItems = (currentRun?.excludedItems ?? []).filter(
    (item) => !deletedOpportunityIds.has(item.opportunityId),
  );
  const qualityReviewsByOpportunity = useMemo(
    () =>
      new Map(
        (presentedHistory ?? [])
          .filter((item) => item.qualityReview !== undefined)
          .map((item) => [item.id, item.qualityReview]),
      ),
    [presentedHistory],
  );


  const currentCards = useMemo(
    () =>
      visibleItems.map((item) =>
        currentOpportunityToCard(
          item,
          currentRun?.profileId ?? selectedProfile,
          true,
          qualityReviewsByOpportunity.get(item.opportunityId),
        ),
      ),
    [currentRun?.profileId, qualityReviewsByOpportunity, selectedProfile, visibleItems],
  );

  const excludedCards = useMemo(
    () =>
      visibleExcludedItems.map((item) =>
        currentOpportunityToCard(
          item,
          currentRun?.profileId ?? selectedProfile,
          false,
        ),
      ),
    [currentRun?.profileId, selectedProfile, visibleExcludedItems],
  );

  const currentOpportunityIds = useMemo(
    () => new Set([...currentCards, ...excludedCards].map((item) => item.id)),
    [currentCards, excludedCards],
  );


  const directLinks = useMemo(
    () =>
      visibleItems.flatMap((item) => {
        const card = currentOpportunityToCard(item, currentRun?.profileId ?? selectedProfile);
        if (
          !item.classification.eligible ||
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
    setLimit(defaultLimitForProfile(nextProfileId));
    setCurrentRun(null);
    setSearchRunReview(null);
    setIsSearchRunReviewing(false);
    setSearchRunReviewError(null);

    setQualityReviewEnabledForCurrentRun(false);
    setQualityReviewEnabled(false);
    setIsQualityReviewControlVisible(false);
    setHasSearched(false);
    setSearchError(null);
    setSearchTiming(null);
    setCopyStatus("idle");
    setPresentedHistory(null);
    setExcludedHistory(null);
    setHistoryError(null);
    setHistoryView("presented");
    setDeletingOpportunityIds(new Set());
    setDeletedOpportunityIds(new Set());
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSearching) return;

    setHasSearched(true);
    setIsSearching(true);
    setSearchError(null);
    setCurrentRun(null);
    setSearchRunReview(null);
    setIsSearchRunReviewing(false);
    setSearchRunReviewError(null);

    setQualityReviewEnabledForCurrentRun(false);
    setSearchTiming({ startedAt: Date.now() });
    setCopyStatus("idle");

    try {
      const run = await runRadar({
        profileId: selectedProfile,
        limit,
        enableQualityReview: qualityReviewEnabled,
      });

      if (run.profileId !== selectedProfile) {
        setSearchError({
          message: "El servidor respondió con resultados de otro perfil. No los mostraremos.",
        });
        return;
      }

      setCurrentRun(run);
      setQualityReviewEnabledForCurrentRun(qualityReviewEnabled);
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

  async function handleSearchRunReview() {
    if (!currentRun || isSearchRunReviewing) return;

    const runId = currentRun.runId;
    const profileId = currentRun.profileId;
    setIsSearchRunReviewing(true);
    setSearchRunReviewError(null);

    try {
      const review = await reviewSearchRun(runId, profileId);
      setSearchRunReview(review);
    } catch (error) {
      setSearchRunReviewError(
        toRequestError(error, "No pudimos generar la revision de la busqueda."),
      );
    } finally {
      setIsSearchRunReviewing(false);
    }
  }


  async function handleSoftDelete(opportunity: OpportunityCardModel) {
    if (deletingOpportunityIds.has(opportunity.id)) return;

    setDeletingOpportunityIds((current) => new Set(current).add(opportunity.id));
    try {
      await softDeleteOpportunity(opportunity.id, opportunity.profileId);
      setDeletedOpportunityIds((current) => new Set(current).add(opportunity.id));
      setPresentedHistory((items) =>
        items?.filter((item) => item.id !== opportunity.id) ?? null,
      );
      setExcludedHistory((items) =>
        items?.filter((item) => item.id !== opportunity.id) ?? null,
      );
      setHistoryRefreshKey((value) => value + 1);
      setCopyStatus("idle");
    } catch (error) {
      setSearchError(toRequestError(error, "No pudimos ocultar la oportunidad."));
    } finally {
      setDeletingOpportunityIds((current) => {
        const next = new Set(current);
        next.delete(opportunity.id);
        return next;
      });
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f0fdfa_0,_#f8fafc_34rem)] text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.5)] sm:p-7">
          <div className="mb-7 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <p className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-teal-800">Job Radar</p>
              <Link className="rounded-md px-2 py-1 text-sm font-semibold text-teal-700 underline-offset-4 transition hover:bg-teal-50 hover:underline" href={"/mi-perfil/" + selectedProfile}>
                Mi perfil
              </Link>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Búsqueda manual de oportunidades
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Perfil activo: {selectedProfileOption?.label ?? selectedProfile}. El historial y tus respuestas se mantienen separados por perfil.
            </p>
          </div>

          <form
            className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(13rem,auto)_auto] lg:items-end"
            onSubmit={handleSearch}
          >
            <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700">
              Perfil
              <select
                className="h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Limite
              <select
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
            {isQualityReviewControlVisible ? (
              <fieldset className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                <legend>Revisor de calidad</legend>
                <div className="flex h-11 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      checked={qualityReviewEnabled}
                      disabled={isSearching}
                      name="quality-review"
                      onChange={() => setQualityReviewEnabled(true)}
                      type="radio"
                    />
                    Activado
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      checked={!qualityReviewEnabled}
                      disabled={isSearching}
                      name="quality-review"
                      onChange={() => setQualityReviewEnabled(false)}
                      type="radio"
                    />
                    No revisar
                  </label>
                </div>
                <p className="max-w-56 text-xs font-normal leading-4 text-slate-500">
                  Genera una revisión asíncrona para las oportunidades mostradas.
                </p>
              </fieldset>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Revisor de calidad</span>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-600 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={isSearching}
                  onClick={() => setIsQualityReviewControlVisible(true)}
                  type="button"
                >
                  Configurar revisión
                </button>
                <p className="max-w-56 text-xs leading-4 text-slate-500">
                  Desactivado por defecto.
                </p>
              </div>
            )}



            <button
              aria-busy={isSearching}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSearching}
              type="submit"
            >
              {isSearching ? (
                <>
                  <SearchSpinner className="h-5 w-5 text-white" />
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

            <section
              aria-busy={isSearchRunReviewing}
              className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-slate-800"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    Revision de alineacion de la busqueda
                  </h2>
                  <p className="mt-1 max-w-2xl leading-6 text-slate-600">
                    Genera una lectura puntual para desarrolladores sobre este resultado
                    frente al perfil. No se guarda y no cambia las oportunidades.
                  </p>
                </div>
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-sky-700 bg-white px-4 py-2 font-semibold text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                  disabled={isSearchRunReviewing}
                  onClick={handleSearchRunReview}
                  type="button"
                >
                  {isSearchRunReviewing
                    ? "Analizando..."
                    : searchRunReview
                      ? "Analizar de nuevo"
                      : "Analizar alineacion"}
                </button>
              </div>

              {searchRunReviewError ? (
                <div className="mt-4">
                  <ErrorNotice error={searchRunReviewError} />
                </div>
              ) : null}

              {searchRunReview ? (
                <div className="mt-4 space-y-4 border-t border-sky-200 pt-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-lg font-semibold text-slate-950">
                      Alineacion: {searchRunReview.alignmentScore}/100
                    </p>
                    <p className="font-medium text-sky-900">
                      {searchRunReview.assessment === "strong"
                        ? "Fuerte"
                        : searchRunReview.assessment === "mixed"
                          ? "Mixta"
                          : "Debil"}
                    </p>
                  </div>
                  <p className="leading-6">{searchRunReview.summary}</p>

                  {searchRunReview.strengths.length > 0 ? (
                    <div>
                      <h3 className="font-semibold text-slate-950">Fortalezas</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {searchRunReview.strengths.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {searchRunReview.gaps.length > 0 ? (
                    <div>
                      <h3 className="font-semibold text-slate-950">Brechas</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {searchRunReview.gaps.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div>
                    <h3 className="font-semibold text-slate-950">Proximos experimentos</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {searchRunReview.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-950">Evidencia</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                      {searchRunReview.evidence.map((item) => (
                        <li key={item.source + item.detail}>{item.detail}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </section>


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
            ) : (
              <OpportunityGroup
                deletingOpportunityIds={deletingOpportunityIds}
                onSoftDelete={handleSoftDelete}
                opportunities={currentCards}
                title="Oportunidades nuevas verificadas"
              />
            )}

            <ExcludedResultsPanel
              key={currentRun.runId}
              initiallyOpen={currentCards.length === 0}
              deletingOpportunityIds={deletingOpportunityIds}
              onSoftDelete={handleSoftDelete}
              opportunities={excludedCards}
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
          onSoftDelete={handleSoftDelete}
          onToggle={() => setIsHistoryOpen((value) => !value)}
          deletingOpportunityIds={deletingOpportunityIds}
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
