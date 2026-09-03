import type {
  EligibilityCheck,
  FeedbackAction,
  FeedbackReasonCode,
  HistoryOpportunity,
  OpportunityCardModel,
  QualityReview,
  RadarRunItem,
  Verdict,
} from "./types";

export const defaultProfileId = "peter-latam-remote-ai-fullstack-product";

export const fallbackProfiles = [
  {
    id: defaultProfileId,
    label: "Peter - AI/fullstack/product remoto LATAM",
    orderedSources: [],
  },
  {
    id: "romina-remote-spanish-hr",
    label: "Romina - RRHH remoto en espanol",
    orderedSources: [],
  },
];


export const limitOptions = [10, 25, 50] as const;

export const verdictLabels: Record<Verdict, string> = {
  promising: "Prometedoras",
  maybe: "Para revisar",
  reject: "Descartadas",
};

export const verdictBadgeLabels: Record<Verdict, string> = {
  promising: "Prometedora",
  maybe: "Para revisar",
  reject: "Descartada",
};

export const feedbackActionLabels: Record<FeedbackAction, string> = {
  interested: "Me interesa",
  not_relevant: "No es relevante",
  applied: "Ya postulé",
  should_have_been_shown: "Debió mostrarse",
};

export const feedbackReasonLabels: Record<FeedbackReasonCode, string> = {
  not_remote: "No es realmente remoto",
  cannot_hire_argentina: "No contrata desde Argentina",
  requires_advanced_english: "Exige inglés avanzado",
  closed: "La vacante está cerrada",
  junior_or_internship: "Es junior o pasantía",
  wrong_role: "El puesto no corresponde",
  english_description_or_application: "Publicación o postulación en inglés",
  duplicate: "Ya había visto esta vacante",
  broken_link: "El enlace no funciona",
  actually_remote: "Sí es realmente remoto",
  can_hire_argentina: "Sí contrata desde Argentina",
  seniority_matches: "El seniority sí corresponde",
  role_matches: "El puesto sí corresponde",
  still_open: "La vacante sigue abierta",
  english_not_required: "No exige inglés avanzado",
  salary_matches: "El salario sí cumple",
  provider_misclassified: "La fuente fue interpretada incorrectamente",
  other: "Otro",
};

export const negativeFeedbackReasonCodes: FeedbackReasonCode[] = [
  "not_remote", "cannot_hire_argentina", "requires_advanced_english", "closed",
  "junior_or_internship", "wrong_role", "english_description_or_application",
  "duplicate", "broken_link", "other",
];

export const positiveFeedbackReasonCodes: FeedbackReasonCode[] = [
  "actually_remote", "can_hire_argentina", "seniority_matches", "role_matches",
  "still_open", "english_not_required", "salary_matches", "provider_misclassified",
  "other",
];

export const acquisitionModeLabels = {
  web_search: "Búsqueda web",
  himalayas_api: "API directa",
  remote_ok_api: "API directa",
  we_work_remotely_rss: "RSS directo",
  jobspresso_wp_rest: "REST de WordPress",
  randstad_html: "HTML estructurado",
} as const;

export const eligibilityCriterionLabels: Record<string, string> = {
  role: "Rol objetivo",
  role_exclusions: "Familia de puesto",
  work_modality: "Modalidad 100% remota",
  hiring_geography: "Contratación desde Argentina",
  description_language: "Descripción en español",
  application_language: "Postulación en español",
  advanced_english: "Sin inglés avanzado obligatorio",
  seniority: "Seniority requerido",
  active_posting: "Vacante abierta",
};

export const eligibilityStatusLabels = {
  pass: "Cumple",
  fail: "No cumple",
  unknown: "No verificado",
} as const;

const eligibilityReasonLabels: Record<
  string,
  Partial<Record<EligibilityCheck["status"], string>>
> = {
  role: {
    fail: "El título no coincide con los roles objetivo del perfil.",
    unknown: "No se pudo verificar que el puesto corresponda a un rol objetivo.",
  },
  role_exclusions: {
    fail: "El título pertenece a una familia de puestos excluida.",
    unknown: "No se pudo descartar que pertenezca a una familia de puestos excluida.",
  },
  work_modality: {
    fail: "La vacante no es 100% remota.",
    unknown: "No se pudo verificar que la modalidad sea 100% remota.",
  },
  hiring_geography: {
    fail: "La vacante restringe la contratación fuera de Argentina o LATAM.",
    unknown: "No se pudo verificar que contrate personas desde Argentina.",
  },
  description_language: {
    fail: "La descripción no está completamente en español.",
    unknown: "No se pudo verificar el idioma de la descripción.",
  },
  application_language: {
    fail: "El proceso de postulación no está completamente en español.",
    unknown: "No se pudo verificar el idioma del proceso de postulación.",
  },
  advanced_english: {
    fail: "La vacante parece exigir inglés avanzado o fluido.",
    unknown: "No se pudo verificar el nivel de inglés requerido.",
  },
  seniority: {
    fail: "El puesto es junior, inicial, trainee, asistente o pasantía.",
    unknown: "No se pudo verificar el seniority requerido.",
  },
  active_posting: {
    fail: "La vacante está cerrada o ya no acepta postulaciones.",
    unknown: "No se pudo verificar que la postulación siga abierta.",
  },
};

const classificationReasonLabels: Record<string, string> = {
  "is a job search/listing page, not an individual vacancy":
    "Es una página con varias búsquedas o vacantes, no una oferta individual.",
  "is informational content, not a job vacancy":
    "Es contenido informativo, no una oferta laboral.",
  "is an organization homepage, not a job vacancy":
    "Es la página principal de una organización, no una oferta laboral.",
  "is discussion content, not a job vacancy":
    "Es una página de discusión, no una oferta laboral.",
  "appears to be an expired or closed vacancy":
    "La vacante parece estar vencida o cerrada.",
  "could not be verified as an individual job vacancy":
    "No se pudo verificar que sea una oferta laboral individual.",
  "is not an eligible job vacancy":
    "No se pudo validar como una oferta laboral elegible.",
};

export type ExclusionKind = "already_seen" | "overflow" | "unverified" | "rejected";

export const exclusionKindLabels: Record<ExclusionKind, string> = {
  already_seen: "Ya presentada",
  overflow: "Fuera del cupo",
  unverified: "Falta verificar",
  rejected: "No cumple",
};

export function getExclusionKind(model: OpportunityCardModel): ExclusionKind {
  if (model.isNew === false) return "already_seen";
  if (model.eligible) return "overflow";
  if (
    model.verdict === "reject" ||
    model.eligibilityChecks.some((check) => check.status === "fail")
  ) return "rejected";
  if (
    model.verdict === "maybe" ||
    model.eligibilityChecks.some((check) => check.status === "unknown")
  ) {
    return "unverified";
  }
  return "rejected";
}

export function translateEligibilityReason(check: EligibilityCheck): string {
  return eligibilityReasonLabels[check.criterion]?.[check.status] ?? check.reason ?? "";
}

export function getEvaluationReasons(model: OpportunityCardModel): string[] {
  if (model.isNew === false) {
    return ["Esta oportunidad ya había sido presentada anteriormente."];
  }
  if (model.eligible && model.presented === false) {
    return ["Cumplía los criterios, pero quedó fuera del cupo de esta búsqueda."];
  }

  const decisiveStatus = model.verdict === "reject" ? "fail" : "unknown";
  const checkReasons = model.eligibilityChecks
    .filter((check) => check.status === decisiveStatus)
    .map(translateEligibilityReason)
    .filter(Boolean);
  const reasons =
    checkReasons.length > 0
      ? checkReasons
      : model.reasons.map((reason) => classificationReasonLabels[reason] ?? reason);

  return Array.from(new Set(reasons));
}

export function currentOpportunityToCard(
  item: RadarRunItem,
  profileId: string,
  presented = true,
  qualityReview?: QualityReview,
): OpportunityCardModel {
  const originalUrl = item.candidate.url ?? item.candidate.canonicalUrl;
  return {
    id: item.opportunityId,
    profileId,
    title: item.candidate.title,
    companyName: item.candidate.companyName,
    locationText: item.candidate.locationText,
    sourceLabel:
      item.candidate.metadata.sourceLabel ??
      item.classification.facts.sourceDomain ??
      item.candidate.source,
    sourceAttributionUrl: item.candidate.metadata.sourceAttributionUrl,
    score: item.classification.score,
    roleTier: item.classification.roleTier ?? item.classification.facts.roleTier,
    verdict: item.classification.verdict,
    eligible: item.classification.eligible,
    isNew: item.isNew,
    presented,
    reasons: item.classification.reasons,
    facts: item.classification.facts,
    eligibilityChecks: item.classification.eligibilityChecks,
    applicationUrl:
      item.classification.facts.applicationUrl ??
      item.candidate.metadata.applicationUrl ??
      originalUrl,
    originalUrl,
    feedback: item.feedback,
    qualityReview,
  };
}

export function historyOpportunityToCard(
  item: HistoryOpportunity,
  selectedProfileId: string,
): OpportunityCardModel {
  return {
    id: item.id,
    profileId: item.profileId ?? selectedProfileId,
    title: item.title,
    companyName: item.companyName,
    locationText: item.locationText,
    sourceLabel: item.sourceDomain ?? item.sourceKind,
    score: item.latestEvaluation?.score,
    roleTier: item.latestEvaluation?.roleTier ?? item.facts.roleTier,
    verdict: item.latestEvaluation?.verdict,
    eligible: item.latestEvaluation?.eligible,
    isNew: item.latestEvaluation?.isNew,
    presented: item.latestEvaluation?.presented,
    reasons: item.latestEvaluation?.reasons ?? [],
    facts: item.facts,
    eligibilityChecks: item.latestEvaluation?.eligibilityChecks ?? [],
    applicationUrl: item.facts.applicationUrl ?? item.canonicalUrl,
    originalUrl: item.canonicalUrl,
    feedback: item.feedback,
    qualityReview: item.qualityReview,
  };
}

export function getFactBadges(model: OpportunityCardModel): string[] {
  const badges: string[] = [];
  const { facts } = model;

  if (facts.workModality === "remote") badges.push("100% remoto");
  if (["argentina_latam_or_global", "argentina_latam", "global"].includes(facts.hiringScope ?? "")) {
    badges.push("Contrata desde Argentina");
  }
  if (facts.descriptionLanguage === "es") badges.push("Descripción en español");
  if (facts.applicationLanguage === "es") badges.push("Postulación en español");
  if (facts.activityStatus === "open") badges.push("Vacante abierta");
  if (facts.salaryMinUsdMonthly) {
    const maximum = facts.salaryMaxUsdMonthly;
    badges.push(
      maximum && maximum !== facts.salaryMinUsdMonthly
        ? `USD ${facts.salaryMinUsdMonthly}-${maximum}/mes`
        : `USD ${facts.salaryMinUsdMonthly}/mes`,
    );
  }
  if (facts.seniority === "semi_senior_or_above") {
    badges.push("Semi senior o superior");
  }
  if (facts.seniority === "experienced") badges.push("Experiencia comprobable");
  if (
    model.eligibilityChecks.some(
      (check) => check.criterion === "advanced_english" && check.status === "pass",
    )
  ) {
    badges.push("Sin inglés avanzado obligatorio");
  }

  return badges;
}

export function translateStopReason(
  stopReason: string | undefined,
  continuedToNext: boolean,
): string | undefined {
  switch (stopReason) {
    case "target_reached":
      return "Se alcanzó el máximo de oportunidades nuevas.";
    case "source_threshold_met":
      return "La fuente produjo suficientes resultados válidos.";
    case "sources_exhausted":
      return "Se revisaron todas las fuentes configuradas.";
    case "time_budget_exhausted":
      return "Se guardaron los resultados verificados antes del límite de tiempo.";
    default:
      return continuedToNext ? "Se continuó con la siguiente fuente." : undefined;
  }
}
