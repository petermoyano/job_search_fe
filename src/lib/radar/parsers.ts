import type {
  AcquisitionMode,
  CandidateMetadata,
  EligibilityCheck,
  EligibilityStatus,
  FeedbackAction,
  FeedbackReasonCode,
  HistoryEvaluation,
  HistoryOpportunity,
  OpportunityFacts,
  OpportunityFeedback,
  ProfileConfigDocument,
  ProfileOption,
  RadarProfileConfig,
  ProfileSource,
  RadarCandidate,
  RadarClassification,
  RadarRunItem,
  RadarRunResponse,
  SourceSummary,
  Verdict,
} from "./types";

export class RadarContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RadarContractError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RadarContractError(`${path} debe ser un objeto.`);
  }

  return value;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new RadarContractError(`${path} debe ser una lista.`);
  }

  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new RadarContractError(`${path} debe ser un texto no vacío.`);
  }

  return value.trim();
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requireString(value, path);
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RadarContractError(`${path} debe ser un número.`);
  }

  return value;
}

function optionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireNumber(value, path);
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new RadarContractError(`${path} debe ser verdadero o falso.`);
  }

  return value;
}

function readStringArray(value: unknown, path: string): string[] {
  return requireArray(value, path).map((item, index) =>
    requireString(item, `${path}[${index}]`),
  );
}

function optionalHttpUrl(value: unknown, path: string): string | undefined {
  const url = optionalString(value, path);
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return url;
}

function parseVerdict(value: unknown, path: string): Verdict {
  switch (value) {
    case "promising":
    case "maybe":
    case "reject":
      return value;
    default:
      throw new RadarContractError(`${path} contiene un veredicto desconocido.`);
  }
}

function parseEligibilityStatus(value: unknown, path: string): EligibilityStatus {
  switch (value) {
    case "pass":
    case "fail":
    case "unknown":
      return value;
    default:
      throw new RadarContractError(`${path} contiene un estado desconocido.`);
  }
}

function parseAcquisitionMode(value: unknown, path: string): AcquisitionMode {
  switch (value) {
    case "web_search":
    case "himalayas_api":
    case "remote_ok_api":
    case "we_work_remotely_rss":
      return value;
    default:
      throw new RadarContractError(`${path} contiene un modo de adquisición desconocido.`);
  }
}

function parseFeedbackAction(value: unknown, path: string): FeedbackAction {
  switch (value) {
    case "interested":
    case "not_relevant":
    case "applied":
    case "should_have_been_shown":
      return value;
    default:
      throw new RadarContractError(`${path} contiene una acción desconocida.`);
  }
}

function parseFeedbackReasonCode(value: unknown, path: string): FeedbackReasonCode {
  switch (value) {
    case "not_remote":
    case "cannot_hire_argentina":
    case "requires_advanced_english":
    case "closed":
    case "junior_or_internship":
    case "wrong_role":
    case "english_description_or_application":
    case "duplicate":
    case "broken_link":
    case "actually_remote":
    case "can_hire_argentina":
    case "seniority_matches":
    case "role_matches":
    case "still_open":
    case "english_not_required":
    case "salary_matches":
    case "provider_misclassified":
    case "other":
      return value;
    default:
      throw new RadarContractError(`${path} contiene un motivo desconocido.`);
  }
}

function parseMetadata(value: unknown, path: string): CandidateMetadata {
  if (value === undefined || value === null) return {};

  const record = requireRecord(value, path);
  return {
    sourceId: optionalString(record.source_id, `${path}.source_id`),
    sourceLabel: optionalString(record.source_label, `${path}.source_label`),
    applicationUrl: optionalHttpUrl(record.application_url, `${path}.application_url`),
    acquisitionMode:
      record.acquisition_mode === undefined
        ? undefined
        : parseAcquisitionMode(record.acquisition_mode, `${path}.acquisition_mode`),
    sourceAttributionUrl: optionalHttpUrl(
      record.source_attribution_url ?? record.attribution_url,
      `${path}.source_attribution_url`,
    ),
  };
}

function parseFacts(value: unknown, path: string): OpportunityFacts {
  if (value === undefined || value === null) return {};

  const record = requireRecord(value, path);
  return {
    sourceDomain: optionalString(record.source_domain, `${path}.source_domain`),
    descriptionLanguage: optionalString(
      record.description_language,
      `${path}.description_language`,
    ),
    applicationLanguage: optionalString(
      record.application_language,
      `${path}.application_language`,
    ),
    workModality: optionalString(record.work_modality, `${path}.work_modality`),
    hiringScope: optionalString(record.hiring_scope, `${path}.hiring_scope`),
    seniority: optionalString(record.seniority, `${path}.seniority`),
    activityStatus: optionalString(record.activity_status, `${path}.activity_status`),
    publishedAt: optionalString(record.published_at, `${path}.published_at`),
    roleTier: optionalNumber(record.role_tier, `${path}.role_tier`),
    applicationUrl: optionalHttpUrl(record.application_url, `${path}.application_url`),
    salaryText: optionalString(record.salary_text, `${path}.salary_text`),
    salaryMinUsdMonthly: optionalNumber(
      record.salary_min_usd_monthly,
      `${path}.salary_min_usd_monthly`,
    ),
    salaryMaxUsdMonthly: optionalNumber(
      record.salary_max_usd_monthly,
      `${path}.salary_max_usd_monthly`,
    ),
  };
}

function parseEligibilityCheck(value: unknown, path: string): EligibilityCheck {
  const record = requireRecord(value, path);
  return {
    criterion: requireString(record.criterion, `${path}.criterion`),
    status: parseEligibilityStatus(record.status, `${path}.status`),
    reason: optionalString(record.reason, `${path}.reason`),
  };
}

function parseEligibilityChecks(value: unknown, path: string): EligibilityCheck[] {
  return requireArray(value, path).map((item, index) =>
    parseEligibilityCheck(item, `${path}[${index}]`),
  );
}

function parseCandidate(value: unknown, path: string): RadarCandidate {
  const record = requireRecord(value, path);
  return {
    source: requireString(record.source, `${path}.source`),
    title: optionalString(record.title, `${path}.title`) ?? "Oferta sin título",
    companyName: optionalString(record.company_name, `${path}.company_name`),
    locationText: optionalString(record.location_text, `${path}.location_text`),
    url: optionalHttpUrl(record.url, `${path}.url`),
    canonicalUrl: optionalHttpUrl(record.canonical_url, `${path}.canonical_url`),
    metadata: parseMetadata(record.metadata, `${path}.metadata`),
  };
}

function parseClassification(value: unknown, path: string): RadarClassification {
  const record = requireRecord(value, path);
  return {
    verdict: parseVerdict(record.verdict, `${path}.verdict`),
    eligible: requireBoolean(record.eligible, `${path}.eligible`),
    score: requireNumber(record.score, `${path}.score`),
    roleTier: optionalNumber(record.role_tier, `${path}.role_tier`),
    reasons: readStringArray(record.reasons, `${path}.reasons`),
    facts: parseFacts(record.facts, `${path}.facts`),
    eligibilityChecks: parseEligibilityChecks(
      record.eligibility_checks,
      `${path}.eligibility_checks`,
    ),
  };
}

function parseFeedback(
  value: unknown,
  path: string,
  fallback: { opportunityId: string; profileId?: string },
): OpportunityFeedback {
  const record = requireRecord(value, path);
  const opportunityId =
    optionalString(record.opportunity_id, `${path}.opportunity_id`) ?? fallback.opportunityId;
  const profileId =
    optionalString(record.profile_id, `${path}.profile_id`) ?? fallback.profileId;

  if (!profileId) {
    throw new RadarContractError(`${path}.profile_id es obligatorio.`);
  }

  return {
    id: optionalString(record.id, `${path}.id`),
    opportunityId,
    profileId,
    action: parseFeedbackAction(record.action, `${path}.action`),
    reasonCodes: requireArray(record.reason_codes, `${path}.reason_codes`).map((item, index) =>
      parseFeedbackReasonCode(item, `${path}.reason_codes[${index}]`),
    ),
    notes: optionalString(record.notes, `${path}.notes`),
    createdAt: optionalString(record.created_at, `${path}.created_at`),
    updatedAt: optionalString(record.updated_at, `${path}.updated_at`),
  };
}

function parseRunItem(value: unknown, path: string): RadarRunItem {
  const record = requireRecord(value, path);
  const opportunityId = requireString(record.opportunity_id, `${path}.opportunity_id`);
  return {
    opportunityId,
    isNew: requireBoolean(record.is_new, `${path}.is_new`),
    candidate: parseCandidate(record.candidate, `${path}.candidate`),
    classification: parseClassification(record.classification, `${path}.classification`),
  };
}

function parseSourceSummary(value: unknown, path: string): SourceSummary {
  const record = requireRecord(value, path);
  return {
    sourceId: requireString(record.source_id, `${path}.source_id`),
    sourceLabel: requireString(record.source_label, `${path}.source_label`),
    rawCount: requireNumber(record.raw_count, `${path}.raw_count`),
    uniqueCount: requireNumber(record.unique_count, `${path}.unique_count`),
    qualifiedCount: requireNumber(record.qualified_count, `${path}.qualified_count`),
    newQualifiedCount: requireNumber(
      record.new_qualified_count,
      `${path}.new_qualified_count`,
    ),
    excludedCount: requireNumber(record.excluded_count, `${path}.excluded_count`),
    continuedToNext: requireBoolean(
      record.continued_to_next,
      `${path}.continued_to_next`,
    ),
    stopReason: optionalString(record.stop_reason, `${path}.stop_reason`),
    acquisitionMode: parseAcquisitionMode(
      record.acquisition_mode ?? "web_search",
      `${path}.acquisition_mode`,
    ),
    status: record.status === "failed" ? "failed" : "completed",
    errorCode: optionalString(record.error_code, `${path}.error_code`),
    durationMs: optionalNumber(record.duration_ms, `${path}.duration_ms`) ?? 0,
  };
}

function parseProfileSources(value: unknown, path: string): ProfileSource[] {
  if (value === undefined || value === null) return [];

  return requireArray(value, path)
    .flatMap((item, index) => {
      try {
        const record = requireRecord(item, `${path}[${index}]`);
        if (record.enabled === false) return [];
        return [{
          id: requireString(record.id, `${path}[${index}].id`),
          label: requireString(record.label, `${path}[${index}].label`),
          order: requireNumber(record.order, `${path}[${index}].order`),
        }];
      } catch {
        return [];
      }
    })
    .sort((left, right) => left.order - right.order);
}

export function parseProfiles(value: unknown): ProfileOption[] {
  const records = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.profiles)
      ? value.profiles
      : undefined;

  if (!records) {
    throw new RadarContractError("La respuesta de perfiles debe ser una lista.");
  }

  return records.flatMap<ProfileOption>((item, index) => {
    try {
      if (typeof item === "string") {
        const id = requireString(item, `profiles[${index}]`);
        return [{ id, label: id, orderedSources: [] }];
      }

      const record = requireRecord(item, `profiles[${index}]`);
      const id = requireString(record.id, `profiles[${index}].id`);
      return [
        {
          id,
          label: optionalString(record.name, `profiles[${index}].name`) ?? id,
          maxQualifiedResults: optionalNumber(
            record.max_qualified_results,
            `profiles[${index}].max_qualified_results`,
          ),
          orderedSources: parseProfileSources(
            record.ordered_sources,
            `profiles[${index}].ordered_sources`,
          ),
        },
      ];
    } catch {
      return [];
    }
  });
}

export function parseProfileConfigDocument(value: unknown): ProfileConfigDocument {
  const record = requireRecord(value, "profile_config");
  const rawProfile = requireRecord(record.profile, "profile_config.profile");
  const policy = requireRecord(
    rawProfile.eligibility_policy,
    "profile_config.profile.eligibility_policy",
  );

  const profile = rawProfile as unknown as RadarProfileConfig;
  if (!Array.isArray(profile.role_tiers) || !Array.isArray(profile.ordered_sources)) {
    throw new RadarContractError("El perfil editable está incompleto.");
  }
  if (!Array.isArray(policy.excluded_role_terms)) {
    throw new RadarContractError("La política de exclusiones está incompleta.");
  }

  return {
    profile,
    revision: requireNumber(record.revision, "profile_config.revision"),
    persisted: requireBoolean(record.persisted, "profile_config.persisted"),
  };
}

export function parseRadarRun(value: unknown): RadarRunResponse {
  const record = requireRecord(value, "radar_run");
  const rawItems = requireArray(record.items, "radar_run.items");
  const rawExcludedItems = requireArray(
    record.excluded_items,
    "radar_run.excluded_items",
  );

  const items: RadarRunItem[] = [];
  const excludedItems: RadarRunItem[] = [];
  let invalidItemCount = 0;

  rawItems.forEach((item, index) => {
    try {
      items.push(parseRunItem(item, `radar_run.items[${index}]`));
    } catch {
      invalidItemCount += 1;
    }
  });

  rawExcludedItems.forEach((item, index) => {
    try {
      excludedItems.push(parseRunItem(item, `radar_run.excluded_items[${index}]`));
    } catch {
      invalidItemCount += 1;
    }
  });

  const sourceSummaries = requireArray(
    record.source_summaries,
    "radar_run.source_summaries",
  ).flatMap((item, index) => {
    try {
      return [parseSourceSummary(item, `radar_run.source_summaries[${index}]`)];
    } catch {
      return [];
    }
  });

  return {
    runId: requireString(record.run_id, "radar_run.run_id"),
    profileId: requireString(record.profile_id, "radar_run.profile_id"),
    profileVersion: requireString(record.profile_version, "radar_run.profile_version"),
    totalRaw: requireNumber(record.total_raw, "radar_run.total_raw"),
    totalUnique: requireNumber(record.total_unique, "radar_run.total_unique"),
    totalQualified: requireNumber(record.total_qualified, "radar_run.total_qualified"),
    totalNew: requireNumber(record.total_new, "radar_run.total_new"),
    totalExcluded: requireNumber(record.total_excluded, "radar_run.total_excluded"),
    items,
    excludedItems,
    sourceSummaries,
    invalidItemCount,
  };
}

function parseHistoryEvaluation(value: unknown, path: string): HistoryEvaluation {
  const record = requireRecord(value, path);
  return {
    verdict: parseVerdict(record.verdict, `${path}.verdict`),
    eligible: requireBoolean(record.eligible, `${path}.eligible`),
    isNew: requireBoolean(record.is_new, `${path}.is_new`),
    presented: requireBoolean(record.presented, `${path}.presented`),
    score: requireNumber(record.score, `${path}.score`),
    roleTier: optionalNumber(record.role_tier, `${path}.role_tier`),
    eligibilityChecks: parseEligibilityChecks(
      record.eligibility_checks,
      `${path}.eligibility_checks`,
    ),
    reasons:
      record.reasons === undefined
        ? []
        : readStringArray(record.reasons, `${path}.reasons`),
  };
}

function parseHistoryOpportunity(value: unknown, path: string): HistoryOpportunity {
  const record = requireRecord(value, path);
  const id = requireString(record.id, `${path}.id`);
  const profileId = optionalString(record.profile_id, `${path}.profile_id`);
  let feedback: OpportunityFeedback | undefined;

  if (record.feedback !== undefined && record.feedback !== null) {
    try {
      feedback = parseFeedback(record.feedback, `${path}.feedback`, {
        opportunityId: id,
        profileId,
      });
    } catch {
      feedback = undefined;
    }
  }

  return {
    id,
    profileId,
    canonicalUrl: optionalHttpUrl(record.canonical_url, `${path}.canonical_url`),
    sourceKind: requireString(record.source_kind, `${path}.source_kind`),
    sourceDomain: optionalString(record.source_domain, `${path}.source_domain`),
    title: optionalString(record.title, `${path}.title`) ?? "Oferta sin título",
    companyName: optionalString(record.company_name, `${path}.company_name`),
    locationText: optionalString(record.location_text, `${path}.location_text`),
    facts: parseFacts(record.facts, `${path}.facts`),
    firstSeenAt: optionalString(record.first_seen_at, `${path}.first_seen_at`),
    lastSeenAt: optionalString(record.last_seen_at, `${path}.last_seen_at`),
    lastPresentedAt: optionalString(record.last_presented_at, `${path}.last_presented_at`),
    latestEvaluation:
      record.latest_evaluation === undefined || record.latest_evaluation === null
        ? undefined
        : parseHistoryEvaluation(record.latest_evaluation, `${path}.latest_evaluation`),
    feedback,
  };
}

export function parseHistory(value: unknown): HistoryOpportunity[] {
  return requireArray(value, "history").flatMap((item, index) => {
    try {
      return [parseHistoryOpportunity(item, `history[${index}]`)];
    } catch {
      return [];
    }
  });
}

export function parseFeedbackResponse(
  value: unknown,
  context: { opportunityId: string; profileId: string },
): OpportunityFeedback {
  const record = requireRecord(value, "feedback_response");
  const feedbackValue =
    record.feedback !== undefined && record.feedback !== null ? record.feedback : record;
  return parseFeedback(feedbackValue, "feedback_response.feedback", context);
}
