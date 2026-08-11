import type {
  FeedbackAction,
  FeedbackReasonCode,
  HistoryOpportunity,
  OpportunityCardModel,
  RadarRunItem,
  Verdict,
} from "./types";

export const primaryProfileId = "romina-remote-spanish-hr";

export const fallbackProfiles = [
  { id: primaryProfileId, label: "Romina - RRHH remoto en español" },
  {
    id: "romina-mendoza-hr-onsite-hybrid",
    label: "Romina - RRHH Mendoza presencial/híbrido",
  },
  {
    id: "peter-latam-remote-ai-fullstack-product",
    label: "Peter - AI/fullstack/product remoto LATAM",
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
  other: "Otro",
};

export const feedbackReasonCodes = Object.keys(
  feedbackReasonLabels,
) as FeedbackReasonCode[];

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

export function currentOpportunityToCard(
  item: RadarRunItem,
  profileId: string,
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
    score: item.classification.score,
    roleTier: item.classification.roleTier ?? item.classification.facts.roleTier,
    verdict: item.classification.verdict,
    facts: item.classification.facts,
    eligibilityChecks: item.classification.eligibilityChecks,
    applicationUrl:
      item.classification.facts.applicationUrl ??
      item.candidate.metadata.applicationUrl ??
      originalUrl,
    originalUrl,
    feedback: item.feedback,
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
    facts: item.facts,
    eligibilityChecks: item.latestEvaluation?.eligibilityChecks ?? [],
    applicationUrl: item.facts.applicationUrl ?? item.canonicalUrl,
    originalUrl: item.canonicalUrl,
    feedback: item.feedback,
  };
}

export function getFactBadges(model: OpportunityCardModel): string[] {
  const badges: string[] = [];
  const { facts } = model;

  if (facts.workModality === "remote") badges.push("100% remoto");
  if (facts.hiringScope === "argentina_latam_or_global") {
    badges.push("Contrata desde Argentina");
  }
  if (facts.descriptionLanguage === "es") badges.push("Descripción en español");
  if (facts.applicationLanguage === "es") badges.push("Postulación en español");
  if (facts.activityStatus === "open") badges.push("Vacante abierta");
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
    default:
      return continuedToNext ? "Se continuó con la siguiente fuente." : undefined;
  }
}
