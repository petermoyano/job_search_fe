"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Verdict = "promising" | "maybe" | "reject";

type ProfileOption = {
  id: string;
  label: string;
};

type RadarResult = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  score?: number;
  verdict: Verdict;
  source: string;
  url: string;
  reasons: string[];
};

type RadarSummary = {
  totalRaw?: number;
  totalUnique?: number;
  itemCount: number;
  hasItems: boolean;
};

type DirectLink = {
  id: string;
  title: string;
  url: string;
};

type CopyStatus = "idle" | "copied" | "error";

const fallbackProfiles: ProfileOption[] = [
  {
    id: "romina-remote-spanish-hr",
    label: "Romina - RRHH remoto en español",
  },
  {
    id: "romina-mendoza-hr-onsite-hybrid",
    label: "Romina - RRHH Mendoza presencial/híbrido",
  },
  {
    id: "peter-latam-remote-ai-fullstack-product",
    label: "Peter - AI/fullstack/product remoto LATAM",
  },
];

const defaultProfileId = "romina-mendoza-hr-onsite-hybrid";
const limitOptions = [10, 25, 50] as const;

const verdictLabels: Record<Verdict, string> = {
  promising: "Prometedoras",
  maybe: "Para revisar",
  reject: "Descartadas",
};

const verdictBadgeLabels: Record<Verdict, string> = {
  promising: "prometedor",
  maybe: "para revisar",
  reject: "descartado",
};

const verdictStyles: Record<Verdict, string> = {
  promising: "border-emerald-200 bg-emerald-50 text-emerald-800",
  maybe: "border-amber-200 bg-amber-50 text-amber-800",
  reject: "border-slate-200 bg-slate-100 text-slate-700",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberFrom(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function fieldString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = stringFrom(record[key]);
    if (value) return value;
  }

  return undefined;
}

function normalizeApiBaseUrl(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

function buildApiUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function normalizeVerdict(value: unknown): Verdict {
  const verdict = stringFrom(value)?.toLowerCase();

  if (verdict === "promising" || verdict === "prometedor" || verdict === "prometedora") {
    return "promising";
  }

  if (verdict === "reject" || verdict === "rejected" || verdict === "descartada") {
    return "reject";
  }

  return "maybe";
}

function normalizeReasons(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(stringFrom).filter((reason): reason is string => Boolean(reason));
  }

  const reason = stringFrom(value);
  return reason ? [reason] : [];
}

function translateReason(reason: string): string {
  const translations: Array<[RegExp, string]> = [
    [/^matches target role terms:\s*/i, "Coincide con términos del rol objetivo: "],
    [/^matches preferred terms:\s*/i, "Coincide con términos preferidos: "],
    [/^Mendoza local fit:\s*/i, "Ajuste local en Mendoza: "],
    [/^remote fit:\s*/i, "Ajuste para trabajo remoto: "],
    [/^location fit:\s*/i, "Ajuste de ubicación: "],
  ];

  for (const [pattern, replacement] of translations) {
    if (pattern.test(reason)) {
      return reason.replace(pattern, replacement);
    }
  }

  return reason;
}

function getRadarItems(payload: unknown): unknown[] | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    return undefined;
  }

  return payload.items;
}

function normalizeResult(value: unknown, index: number): RadarResult | null {
  if (!isRecord(value) || !isRecord(value.candidate) || !isRecord(value.classification)) {
    return null;
  }

  const candidate = value.candidate;
  const classification = value.classification;
  const title = stringFrom(candidate.title);
  const url = fieldString(candidate, ["url", "canonical_url"]);

  if (!title || !url) return null;

  return {
    id: fieldString(candidate, ["external_id"]) ?? `${url}-${index}`,
    title,
    company: stringFrom(candidate.company_name),
    location: stringFrom(candidate.location_text),
    score: numberFrom(classification.score),
    verdict: normalizeVerdict(classification.verdict),
    source: stringFrom(candidate.source) ?? "tavily",
    url,
    reasons: normalizeReasons(classification.reasons).map(translateReason),
  };
}

function extractResults(payload: unknown): RadarResult[] {
  const items = getRadarItems(payload);
  if (!items) return [];

  return items
    .map((item, index) => normalizeResult(item, index))
    .filter((item): item is RadarResult => item !== null);
}

function extractSummary(payload: unknown): RadarSummary {
  const items = getRadarItems(payload);

  if (!isRecord(payload)) {
    return {
      itemCount: 0,
      hasItems: false,
    };
  }

  return {
    totalRaw: numberFrom(payload.total_raw),
    totalUnique: numberFrom(payload.total_unique),
    itemCount: items?.length ?? 0,
    hasItems: Boolean(items),
  };
}

function extractProfiles(payload: unknown): ProfileOption[] {
  const candidates = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.profiles)
      ? payload.profiles
      : [];

  return candidates
    .map((profile) => {
      if (typeof profile === "string") {
        return { id: profile, label: profile };
      }

      if (!isRecord(profile)) return null;

      const id = fieldString(profile, ["id", "profile_id", "slug"]);
      if (!id) return null;

      return {
        id,
        label: fieldString(profile, ["label", "name", "title"]) ?? id,
      };
    })
    .filter((profile): profile is ProfileOption => profile !== null);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No pudimos completar la búsqueda. Intenta nuevamente.";
}

export default function Home() {
  const apiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const [profiles, setProfiles] = useState<ProfileOption[]>(fallbackProfiles);
  const [selectedProfile, setSelectedProfile] = useState(defaultProfileId);
  const [limit, setLimit] = useState<(typeof limitOptions)[number]>(25);
  const [results, setResults] = useState<RadarResult[]>([]);
  const [summary, setSummary] = useState<RadarSummary | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;

    let ignore = false;

    async function loadProfiles() {
      try {
        const response = await fetch(buildApiUrl(apiBaseUrl, "/radar/profiles"));
        if (!response.ok) return;

        const payload: unknown = await response.json();
        const apiProfiles = extractProfiles(payload);
        if (ignore || apiProfiles.length === 0) return;

        const mergedProfiles = new Map<string, ProfileOption>();
        [...fallbackProfiles, ...apiProfiles].forEach((profile) => {
          mergedProfiles.set(profile.id, profile);
        });
        setProfiles(Array.from(mergedProfiles.values()));
      } catch {
        // The fallback profile list keeps the tool usable while the backend is offline.
      }
    }

    loadProfiles();

    return () => {
      ignore = true;
    };
  }, [apiBaseUrl]);

  const groupedResults = useMemo(
    () => ({
      promising: results.filter((result) => result.verdict === "promising"),
      maybe: results.filter((result) => result.verdict === "maybe"),
      reject: results.filter((result) => result.verdict === "reject"),
    }),
    [results],
  );

  const directLinks = useMemo(
    () =>
      results.map((result) => ({
        id: result.id,
        title: result.title,
        url: result.url,
      })),
    [results],
  );

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSearched(true);
    setIsLoading(true);
    setError(null);
    setResults([]);
    setSummary(null);
    setCopyStatus("idle");

    if (!apiBaseUrl) {
      setError("Falta configurar NEXT_PUBLIC_API_BASE_URL.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(buildApiUrl(apiBaseUrl, "/radar/runs"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: selectedProfile,
          source: "tavily",
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error(`El servidor respondió con estado ${response.status}.`);
      }

      const data: unknown = await response.json();
      console.log("Radar response", data);
      setSummary(extractSummary(data));
      setResults(extractResults(data));
    } catch (searchError) {
      setError(getErrorMessage(searchError));
    } finally {
      setIsLoading(false);
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

  const showEmptyState =
    !isLoading && !error && hasSearched && summary !== null && (!summary.hasItems || summary.itemCount === 0);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Job Radar</p>
            <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
              Búsqueda manual de oportunidades
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Elige un perfil, define cuántas ofertas revisar y lanza una búsqueda con Tavily.
            </p>
          </div>

          <form className="grid gap-4 lg:grid-cols-[1fr_160px_auto] lg:items-end" onSubmit={handleSearch}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Perfil
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={selectedProfile}
                onChange={(event) => setSelectedProfile(event.target.value)}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Límite
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value) as (typeof limitOptions)[number])}
              >
                {limitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="h-11 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Buscando..." : "Buscar oportunidades"}
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-5" aria-live="polite">
          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Buscando oportunidades y ordenando resultados...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800">
              {error}
            </div>
          ) : null}

          {showEmptyState ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No encontramos oportunidades para este perfil por ahora.
            </div>
          ) : null}

          {summary && summary.itemCount > 0 ? <ResultsSummary summary={summary} /> : null}

          {results.length > 0 ? (
            <div className="grid gap-5">
              {(["promising", "maybe", "reject"] as Verdict[]).map((verdict) => (
                <ResultGroup
                  key={verdict}
                  results={groupedResults[verdict]}
                  title={verdictLabels[verdict]}
                  verdict={verdict}
                />
              ))}
              <DirectLinksList links={directLinks} copyStatus={copyStatus} onCopy={handleCopyAllLinks} />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ResultsSummary({ summary }: { summary: RadarSummary }) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm sm:grid-cols-3 sm:p-5">
      <SummaryItem label="Total crudo" value={summary.totalRaw ?? "-"} />
      <SummaryItem label="Total único" value={summary.totalUnique ?? "-"} />
      <SummaryItem label="Resultados" value={summary.itemCount} />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function DirectLinksList({
  links,
  copyStatus,
  onCopy,
}: {
  links: DirectLink[];
  copyStatus: CopyStatus;
  onCopy: () => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Enlaces directos</h2>
          <p className="mt-1 text-sm text-slate-600">Lista de enlaces para compartir por WhatsApp u otro canal.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {copyStatus === "copied" ? <span className="text-sm font-medium text-emerald-700">Copiado</span> : null}
          {copyStatus === "error" ? (
            <span className="text-sm font-medium text-red-700">No se pudo copiar</span>
          ) : null}
          <button
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={links.length === 0}
            onClick={onCopy}
            type="button"
          >
            Copiar todos
          </button>
        </div>
      </div>

      <ol className="space-y-3 text-sm">
        {links.map((link, index) => (
          <li key={link.id} className="rounded-md border border-slate-200 p-3">
            <p className="font-medium text-slate-950">{index + 1}. {link.title}</p>
            <a className="mt-1 block text-teal-800 hover:underline" href={link.url} rel="noreferrer" target="_blank">
              {link.url}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ResultGroup({
  results,
  title,
  verdict,
}: {
  results: RadarResult[];
  title: string;
  verdict: Verdict;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {results.length}
        </span>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-slate-500">Sin resultados en esta categoría.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {results.map((result) => (
            <article key={result.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${verdictStyles[verdict]}`}>
                    {verdictBadgeLabels[result.verdict]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {result.source}
                  </span>
                  {typeof result.score === "number" ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      Puntaje {result.score}
                    </span>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-base font-semibold leading-6 text-slate-950">{result.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                    {result.company ? <span>{result.company}</span> : null}
                    {result.location ? <span>{result.location}</span> : null}
                  </div>
                </div>

                {result.reasons.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                    {result.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}

                <a
                  className="mt-1 inline-flex w-fit items-center rounded-md border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
                  href={result.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Abrir oferta
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
