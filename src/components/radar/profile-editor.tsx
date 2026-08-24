"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  getProfileConfig,
  toRequestError,
  updateProfileConfig,
} from "@/lib/radar/api";
import { acquisitionModeLabels } from "@/lib/radar/presentation";
import type {
  ProfileConfigDocument,
  RadarProfileConfig,
  RequestError,
  SearchSourceConfig,
} from "@/lib/radar/types";

function splitLines(value: string): string[] {
  return Array.from(
    new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)),
  );
}

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "").replace(/\/$/, "");
  }
}

function LinesField({
  id,
  label,
  value,
  onChange,
  help,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (items: string[]) => void;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-800" htmlFor={id}>
      {label}
      {help ? <span className="font-normal leading-5 text-slate-500">{help}</span> : null}
      <textarea
        className="min-h-36 rounded-md border border-slate-300 bg-white px-3 py-2 font-normal leading-6 text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        id={id}
        onChange={(event) => onChange(splitLines(event.target.value))}
        value={value.join("\n")}
      />
    </label>
  );
}

export function ProfileEditor({ profileId }: { profileId: string }) {
  const [document, setDocument] = useState<ProfileConfigDocument | null>(null);
  const [profile, setProfile] = useState<RadarProfileConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<RequestError | null>(null);
  const [saved, setSaved] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceDomain, setSourceDomain] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getProfileConfig(profileId, controller.signal)
      .then((result) => {
        setDocument(result);
        setProfile(result.profile);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(toRequestError(loadError, "No pudimos cargar el perfil editable."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  function updateProfile(update: Partial<RadarProfileConfig>) {
    setProfile((current) => (current ? { ...current, ...update } : current));
    setSaved(false);
  }

  function updateSource(sourceId: string, update: Partial<SearchSourceConfig>) {
    if (!profile) return;
    updateProfile({
      ordered_sources: profile.ordered_sources.map((source) =>
        source.id === sourceId ? { ...source, ...update } : source,
      ),
    });
  }

  function moveSource(sourceId: string, direction: -1 | 1) {
    if (!profile) return;
    const sources = [...profile.ordered_sources].sort((a, b) => a.order - b.order);
    const index = sources.findIndex((source) => source.id === sourceId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= sources.length) return;
    [sources[index], sources[nextIndex]] = [sources[nextIndex], sources[index]];
    updateProfile({
      ordered_sources: sources.map((source, sourceIndex) => ({
        ...source,
        order: sourceIndex + 1,
      })),
    });
  }

  function addSource() {
    if (!profile) return;
    const domain = normalizeDomain(sourceDomain);
    const label = sourceLabel.trim();
    if (!domain || !label) {
      setError({ message: "Indicá un nombre y un dominio válidos para agregar la fuente." });
      return;
    }
    if (profile.ordered_sources.some((source) => source.domains.includes(domain))) {
      setError({ message: "Ese dominio ya está en el catálogo de fuentes." });
      return;
    }
    const id = `custom-${domain.replace(/[^a-z0-9]+/g, "-")}`;
    updateProfile({
      ordered_sources: [
        ...profile.ordered_sources,
        {
          id,
          label,
          domains: [domain],
          order: profile.ordered_sources.length + 1,
          primary: false,
          max_results: 5,
          min_qualified_to_stop: 3,
          enabled: true,
          acquisition_mode: "web_search",
          attribution_url: `https://${domain}`,
        },
      ],
      source_references: Array.from(
        new Set([...profile.source_references, `https://${domain}`]),
      ),
    });
    setSourceLabel("");
    setSourceDomain("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !document |) return;
    if (!profile.ordered_sources.some((source) => source.enabled)) {
      setError({ message: "Dejá al menos una fuente habilitada." });
      return;
    }
    setIsSaving(true);
    setSaved(false);
    setError(null);
    try {
      const result = await updateProfileConfig({
        profileId,
        expectedRevision: document.revision,
        profile,
      });
      setDocument(result);
      setProfile(result.profile);
      setSaved(true);
    } catch (saveError: unknown) {
      setError(toRequestError(saveError, "No pudimos guardar el perfil."));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-slate-600">Cargando perfil…</main>;
  }

  if (!profile || !document |) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
          {error?.message ?? "El perfil no está disponible."}
        </p>
        <Link className="text-sm font-semibold text-teal-700 underline" href="/">Volver al radar</Link>
      </main>
    );
  }

  const policy = profile.eligibility_policy ?? { require_fully_remote: false, eligible_remote_regions: [], allowed_hybrid_locations: [], require_spanish_application: false, reject_advanced_english: false, rejected_seniority_terms: [], excluded_role_terms: [], require_active_posting: false };
  const sources = [...profile.ordered_sources].sort((a, b) => a.order - b.order);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <form className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6" onSubmit={handleSubmit}>
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium uppercase text-teal-700">Mi perfil</p>
              <h1 className="mt-1 text-2xl font-semibold">{profile.name}</h1>
              <p className="mt-2 text-sm text-slate-600">
                Los cambios se aplican sólo a búsquedas nuevas. Revisión {document.revision}
                {document.persisted ? " guardada" : " basada en la configuración inicial"}.
              </p>
            </div>
            <Link className="text-sm font-semibold text-teal-700 underline" href="/">Volver al radar</Link>
          </div>
        </header>

        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Perfil y puestos buscados</h2>
          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="candidate-summary">
            Resumen profesional
            <textarea
              className="min-h-28 rounded-md border border-slate-300 px-3 py-2 font-normal leading-6 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              id="candidate-summary"
              onChange={(event) => updateProfile({ candidate_summary: event.target.value })}
              value={profile.candidate_summary ?? ""}
            />
          </label>
          <div className="grid gap-5 lg:grid-cols-3">
            {profile.role_tiers.map((tier, index) => (
              <LinesField
                help="Un título o equivalente por línea."
                id={`tier-${tier.tier}`}
                key={tier.tier}
                label={`Tier ${tier.tier}: ${tier.label}`}
                onChange={(titles) => updateProfile({
                  role_tiers: profile.role_tiers.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, titles } : item,
                  ),
                })}
                value={tier.titles}
              />
            ))}
          </div>
        </section>

        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Filtros obligatorios</h2>
          <p className="rounded-md bg-sky-50 p-3 text-sm leading-6 text-sky-950">
            Se aceptan puestos 100% remotos que contraten desde Argentina, y puestos híbridos sólo si la sede presencial está en Mendoza. Los presenciales se excluyen.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="description-language">
              Idioma de las ofertas
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                id="description-language"
                onChange={(event) => updateProfile({
                  eligibility_policy: {
                    ...policy,
                    required_description_language: event.target.value || null,
                  },
                })}
                value={policy.required_description_language ?? ""}
              >
                <option value="">Sin preferencia de idioma</option>
                <option value="es">Sólo ofertas en español</option>
                <option value="en">Sólo ofertas en inglés</option>
              </select>
              <span className="font-normal text-slate-500">Las ofertas en otro idioma no se mostrarán en búsquedas nuevas.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="salary-floor">
              Piso salarial mensual (USD)
              <input
                className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                id="salary-floor"
                min="0"
                onChange={(event) => updateProfile({
                  eligibility_policy: {
                    ...policy,
                    minimum_salary_usd_monthly: Number(event.target.value),
                  },
                })}
                type="number"
                value={policy.minimum_salary_usd_monthly ?? 0}
              />
              <span className="font-normal text-slate-500">No hay techo salarial. Si una vacante no publica salario, no se descarta por ese motivo.</span>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-slate-200 p-4 text-sm leading-6">
              <input
                checked={policy.reject_advanced_english}
                className="mt-1 h-4 w-4 accent-teal-700"
                onChange={(event) => updateProfile({
                  eligibility_policy: { ...policy, reject_advanced_english: event.target.checked },
                })}
                type="checkbox"
              />
              Excluir cuando inglés avanzado o fluido sea un requisito obligatorio. Inglés básico o intermedio es aceptable.
            </label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-md border border-slate-200 p-4 text-sm leading-6">
              <input
                checked={policy.require_spanish_application}
                className="mt-1 h-4 w-4 accent-teal-700"
                onChange={(event) => updateProfile({
                  eligibility_policy: {
                    ...policy,
                    require_spanish_application: event.target.checked,
                  },
                })}
                type="checkbox"
              />
              Exigir que el proceso de postulación esté disponible en español.
            </label>
            <LinesField
              help="Ventas, call center, contabilidad e impuestos, entre otros."
              id="role-exclusions"
              label="Puestos y familias excluidas"
              onChange={(excluded_role_terms) => updateProfile({
                eligibility_policy: { ...policy, excluded_role_terms },
              })}
              value={policy.excluded_role_terms}
            />
            <LinesField
              help="No incluyas asistente o auxiliar: pueden ser puestos válidos de Tier 3."
              id="seniority-exclusions"
              label="Indicadores de nivel excluido"
              onChange={(rejected_seniority_terms) => updateProfile({
                eligibility_policy: { ...policy, rejected_seniority_terms },
              })}
              value={policy.rejected_seniority_terms}
            />
          </div>
        </section>

        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Fuentes permitidas</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Sólo las fuentes habilitadas entran en búsquedas nuevas; el orden define la prioridad.
            </p>
          </div>
          <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {sources.map((source, index) => (
              <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center" key={source.id}>
                <label className="flex min-w-0 flex-1 items-start gap-3 text-sm">
                  <input
                    checked={source.enabled}
                    className="mt-1 h-4 w-4 accent-teal-700"
                    onChange={(event) => updateSource(source.id, { enabled: event.target.checked })}
                    type="checkbox"
                  />
                  <span>
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {source.label}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {acquisitionModeLabels[source.acquisition_mode ?? "web_search"]}
                      </span>
                    </span>
                    <span className="block break-all text-slate-500">{source.domains.join(", ")}</span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <button className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-40" disabled={index === 0} onClick={() => moveSource(source.id, -1)} type="button">Subir</button>
                  <button className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-40" disabled={index === sources.length - 1} onClick={() => moveSource(source.id, 1)} type="button">Bajar</button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 rounded-md bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Nombre de nueva fuente
              <input className="h-10 rounded-md border border-slate-300 px-3 font-normal" onChange={(event) => setSourceLabel(event.target.value)} placeholder="Ej. Portal LATAM" value={sourceLabel} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Dominio
              <input className="h-10 rounded-md border border-slate-300 px-3 font-normal" onChange={(event) => setSourceDomain(event.target.value)} placeholder="portal.com" value={sourceDomain} />
            </label>
            <button className="h-10 rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800" onClick={addSource} type="button">Agregar</button>
          </div>
          <LinesField
            help="Un dominio por línea. La lista negra siempre prevalece, aunque la fuente esté habilitada arriba."
            id="excluded-domains"
            label="Lista negra de sitios"
            onChange={(items) => updateProfile({ excluded_source_domains: items.map(normalizeDomain).filter(Boolean) })}
            value={profile.excluded_source_domains}
          />
        </section>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">{error.message}</p> : null}
        {saved ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">Perfil guardado. Se usará desde la próxima búsqueda.</p> : null}
        <div className="sticky bottom-0 flex justify-end border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
          <button className="h-11 rounded-md bg-teal-700 px-6 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-400" disabled={isSaving} type="submit">
            {isSaving ? "Guardando…" : "Guardar perfil"}
          </button>
        </div>
      </form>
    </main>
  );
}
