import type { RadarProfileConfig } from "@/lib/radar/types";
import type {
  ResumeApplySection,
  ResumeDraft,
  ResumeProfileData,
} from "@/lib/resume/types";
import { hasSectionData } from "@/lib/resume/workflow";

export const resumeSections: {
  id: ResumeApplySection;
  label: string;
}[] = [
  { id: "full_name", label: "Nombre completo" },
  { id: "headline", label: "Título profesional" },
  { id: "professional_summary", label: "Resumen" },
  { id: "location", label: "Ubicación" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experiencia" },
  { id: "education", label: "Educación" },
  { id: "languages", label: "Idiomas" },
  { id: "certifications", label: "Certificaciones" },
];

const emptyProfessionalProfile: ResumeProfileData = {
  full_name: null,
  headline: null,
  professional_summary: null,
  location: null,
  email: null,
  phone: null,
  linkedin_url: null,
  github_url: null,
  skills: [],
  experience: [],
  education: [],
  languages: [],
  certifications: [],
};

function Value({ children }: { children?: string | null }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
      {children?.trim() || "Sin información"}
    </p>
  );
}

function Comparison({
  label,
  selected,
  disabled,
  onToggle,
  current,
  detected,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  current?: string | null;
  detected?: string | null;
}) {
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <label className="flex items-center gap-3 font-semibold">
        <input
          checked={selected}
          className="h-4 w-4 accent-teal-700"
          disabled={disabled}
          onChange={onToggle}
          type="checkbox"
        />
        {label}
      </label>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Actual</p>
          <Value>{current}</Value>
        </div>
        <div className="rounded-md bg-teal-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-teal-700">
            Detectado en el CV
          </p>
          <Value>{detected}</Value>
        </div>
      </div>
    </article>
  );
}

function CollectionComparison({
  label,
  selected,
  disabled,
  onToggle,
  current,
  detected,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  current: string[];
  detected: string[];
}) {
  const list = (items: string[]) =>
    items.length ? (
      <ul className="space-y-1 text-sm leading-6 text-slate-700">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>• {item}</li>
        ))}
      </ul>
    ) : (
      <Value />
    );
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <label className="flex items-center gap-3 font-semibold">
        <input
          checked={selected}
          className="h-4 w-4 accent-teal-700"
          disabled={disabled}
          onChange={onToggle}
          type="checkbox"
        />
        {label}
      </label>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Actual</p>
          {list(current)}
        </div>
        <div className="rounded-md bg-teal-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-teal-700">
            Detectado en el CV
          </p>
          {list(detected)}
        </div>
      </div>
    </article>
  );
}

export function ResumeDraftReview({
  draft,
  profile,
  selected,
  disabled,
  onToggle,
}: {
  draft: ResumeDraft;
  profile: RadarProfileConfig;
  selected: Set<ResumeApplySection>;
  disabled: boolean;
  onToggle: (section: ResumeApplySection) => void;
}) {
  const current = profile.professional_profile ?? emptyProfessionalProfile;
  const detected = draft.payload;
  const available = new Set(
    resumeSections
      .filter((section) => hasSectionData(detected, section.id))
      .map((section) => section.id),
  );
  const experience = (value: ResumeProfileData) =>
    value.experience.map((item) =>
      [item.title, item.company, item.start_date, item.end_date || (item.is_current ? "Actualidad" : null)]
        .filter(Boolean)
        .join(" · "),
    );
  const education = (value: ResumeProfileData) =>
    value.education.map((item) =>
      [item.degree, item.field_of_study, item.institution].filter(Boolean).join(" · "),
    );
  const languages = (value: ResumeProfileData) =>
    value.languages.map((item) =>
      [item.language, item.level ?? item.raw_level].filter(Boolean).join(" · "),
    );
  const certifications = (value: ResumeProfileData) =>
    value.certifications.map((item) =>
      [item.name, item.issuer, item.date].filter(Boolean).join(" · "),
    );
  const toggle = (section: ResumeApplySection) => () => onToggle(section);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Revisá antes de aplicar</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Elegí únicamente las secciones que querés incorporar. Nada se aplica
          automáticamente.
        </p>
      </div>
      {available.has("full_name") ? (
        <Comparison
          current={current.full_name ?? profile.owner_name}
          detected={detected.full_name}
          disabled={disabled}
          label="Nombre completo"
          onToggle={toggle("full_name")}
          selected={selected.has("full_name")}
        />
      ) : null}
      {available.has("headline") ? (
        <Comparison
          current={current.headline}
          detected={detected.headline}
          disabled={disabled}
          label="Título profesional"
          onToggle={toggle("headline")}
          selected={selected.has("headline")}
        />
      ) : null}
      {available.has("professional_summary") ? (
        <Comparison
          current={profile.candidate_summary ?? current.professional_summary}
          detected={detected.professional_summary}
          disabled={disabled}
          label="Resumen profesional"
          onToggle={toggle("professional_summary")}
          selected={selected.has("professional_summary")}
        />
      ) : null}
      {available.has("location") ? (
        <Comparison
          current={current.location}
          detected={detected.location}
          disabled={disabled}
          label="Ubicación"
          onToggle={toggle("location")}
          selected={selected.has("location")}
        />
      ) : null}
      {available.has("skills") ? (
        <CollectionComparison
          current={current.skills.map((item) => item.name)}
          detected={detected.skills.map((item) => item.name)}
          disabled={disabled}
          label="Skills"
          onToggle={toggle("skills")}
          selected={selected.has("skills")}
        />
      ) : null}
      {available.has("experience") ? (
        <CollectionComparison
          current={experience(current)}
          detected={experience(detected)}
          disabled={disabled}
          label="Experiencia"
          onToggle={toggle("experience")}
          selected={selected.has("experience")}
        />
      ) : null}
      {available.has("education") ? (
        <CollectionComparison
          current={education(current)}
          detected={education(detected)}
          disabled={disabled}
          label="Educación"
          onToggle={toggle("education")}
          selected={selected.has("education")}
        />
      ) : null}
      {available.has("languages") ? (
        <CollectionComparison
          current={languages(current)}
          detected={languages(detected)}
          disabled={disabled}
          label="Idiomas"
          onToggle={toggle("languages")}
          selected={selected.has("languages")}
        />
      ) : null}
      {available.has("certifications") ? (
        <CollectionComparison
          current={certifications(current)}
          detected={certifications(detected)}
          disabled={disabled}
          label="Certificaciones"
          onToggle={toggle("certifications")}
          selected={selected.has("certifications")}
        />
      ) : null}
      {detected.email || detected.phone || detected.linkedin_url || detected.github_url ? (
        <aside className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-semibold">Datos de contacto detectados</p>
          <p>
            {[detected.email, detected.phone, detected.linkedin_url, detected.github_url]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-1">
            Se muestran para revisión, pero el perfil actual todavía no permite guardarlos.
          </p>
        </aside>
      ) : null}
    </div>
  );
}
