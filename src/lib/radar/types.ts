import type { ResumeProfileData } from "@/lib/resume/types";

export type Verdict = "promising" | "maybe" | "reject";

export type EligibilityStatus = "pass" | "fail" | "unknown";

export type FeedbackAction =
  | "interested"
  | "not_relevant"
  | "applied"
  | "should_have_been_shown";

export type FeedbackReasonCode =
  | "not_remote"
  | "cannot_hire_argentina"
  | "requires_advanced_english"
  | "closed"
  | "junior_or_internship"
  | "wrong_role"
  | "english_description_or_application"
  | "duplicate"
  | "broken_link"
  | "actually_remote"
  | "can_hire_argentina"
  | "seniority_matches"
  | "role_matches"
  | "still_open"
  | "english_not_required"
  | "salary_matches"
  | "provider_misclassified"
  | "other";

export type AcquisitionMode =
  | "web_search"
  | "himalayas_api"
  | "remote_ok_api"
  | "we_work_remotely_rss"
  | "jobspresso_wp_rest"
  | "randstad_html";

export type ProfileOption = {
  id: string;
  label: string;
  maxQualifiedResults?: number;
  orderedSources: ProfileSource[];
};

export type ProfileSource = {
  id: string;
  label: string;
  order: number;
};

export type RoleTierConfig = {
  tier: number;
  label: string;
  titles: string[];
};

export type SearchSourceConfig = {
  id: string;
  label: string;
  domains: string[];
  order: number;
  primary: boolean;
  max_results: number;
  min_qualified_to_stop: number;
  enabled: boolean;
  acquisition_mode?: AcquisitionMode;
  attribution_url?: string | null;
};

export type EligibilityPolicyConfig = {
  require_fully_remote: boolean;
  eligible_remote_regions: string[];
  allowed_hybrid_locations: string[];
  required_description_language?: string | null;
  required_application_language?: string | null;
  require_spanish_application: boolean;
  reject_advanced_english: boolean;
  rejected_seniority_terms: string[];
  excluded_role_terms: string[];
  require_active_posting: boolean;
  minimum_salary_usd_monthly?: number | null;
};

export type RadarProfileConfig = {
  id: string;
  name: string;
  description: string;
  version: string;
  owner_id?: string | null;
  owner_name?: string | null;
  candidate_summary?: string | null;
  professional_profile?: ResumeProfileData;
  target_roles: string[];
  role_tiers: RoleTierConfig[];
  location_policy: string;
  eligibility_policy?: EligibilityPolicyConfig | null;
  required_terms: string[];
  preferred_terms: string[];
  reject_terms: string[];
  positive_scoring_groups: unknown[];
  negative_scoring_groups: unknown[];
  source_references: string[];
  preferred_source_domains: string[];
  excluded_source_domains: string[];
  ordered_sources: SearchSourceConfig[];
  queries: unknown[];
  max_results_per_query: number;
  max_qualified_results: number;
};

export type ProfileConfigDocument = {
  profile: RadarProfileConfig;
  revision: number;
  persisted: boolean;
};

export type CandidateMetadata = {
  sourceId?: string;
  sourceLabel?: string;
  applicationUrl?: string;
  acquisitionMode?: AcquisitionMode;
  sourceAttributionUrl?: string;
};

export type RadarCandidate = {
  source: string;
  title: string;
  companyName?: string;
  locationText?: string;
  url?: string;
  canonicalUrl?: string;
  metadata: CandidateMetadata;
};

export type OpportunityFacts = {
  sourceDomain?: string;
  descriptionLanguage?: string;
  applicationLanguage?: string;
  workModality?: string;
  hiringScope?: string;
  seniority?: string;
  activityStatus?: string;
  publishedAt?: string;
  roleTier?: number;
  applicationUrl?: string;
  salaryText?: string;
  salaryMinUsdMonthly?: number;
  salaryMaxUsdMonthly?: number;
};

export type EligibilityCheck = {
  criterion: string;
  status: EligibilityStatus;
  reason?: string;
};

export type RadarClassification = {
  verdict: Verdict;
  eligible: boolean;
  score: number;
  roleTier?: number;
  reasons: string[];
  facts: OpportunityFacts;
  eligibilityChecks: EligibilityCheck[];
};

export type OpportunityFeedback = {
  id?: string;
  opportunityId: string;
  profileId: string;
  action: FeedbackAction;
  reasonCodes: FeedbackReasonCode[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RadarRunItem = {
  opportunityId: string;
  isNew: boolean;
  candidate: RadarCandidate;
  classification: RadarClassification;
  feedback?: OpportunityFeedback;
};

export type SourceSummary = {
  sourceId: string;
  sourceLabel: string;
  rawCount: number;
  uniqueCount: number;
  qualifiedCount: number;
  newQualifiedCount: number;
  excludedCount: number;
  continuedToNext: boolean;
  stopReason?: string;
  acquisitionMode: AcquisitionMode;
  status: "completed" | "failed";
  errorCode?: string;
  durationMs: number;
};

export type RadarRunResponse = {
  runId: string;
  profileId: string;
  profileVersion: string;
  totalRaw: number;
  totalUnique: number;
  totalQualified: number;
  totalNew: number;
  totalExcluded: number;
  items: RadarRunItem[];
  excludedItems: RadarRunItem[];
  sourceSummaries: SourceSummary[];
  invalidItemCount: number;
};
export type SearchRunReviewAssessment = "strong" | "mixed" | "weak";

export type SearchRunReviewEvidence = {
  source: "profile" | "run_summary" | "source_summary" | "opportunity";
  detail: string;
};

export type SearchRunReview = {
  alignmentScore: number;
  assessment: SearchRunReviewAssessment;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  evidence: SearchRunReviewEvidence[];
};



export type HistoryEvaluation = {
  verdict: Verdict;
  eligible: boolean;
  isNew: boolean;
  presented: boolean;
  score: number;
  roleTier?: number;
  eligibilityChecks: EligibilityCheck[];
  reasons: string[];
};

export type QualityReviewStatus = "pending" | "processing" | "completed";

export type QualityReviewVerdict = "up" | "down";

export type QualityReviewEvidence = {
  source: "job_text" | "facts" | "eligibility_checks" | "profile";
  detail: string;
};

export type QualityReview = {
  id: string;
  status: QualityReviewStatus;
  verdict?: QualityReviewVerdict;
  qualityScore?: number;
  confidence?: number;
  rationale: string[];
  risks: string[];
  evidence: QualityReviewEvidence[];
  rubricVersion: string;
  completedAt?: string;
};

export type HistoryOpportunity = {
  id: string;
  profileId: string;
  runId: string;
  profileVersion: string;
  evaluatedAt: string;
  canonicalUrl?: string;
  sourceKind: string;
  sourceDomain?: string;
  title: string;
  companyName?: string;
  locationText?: string;
  facts: OpportunityFacts;
  firstSeenAt?: string;
  lastSeenAt?: string;
  lastPresentedAt?: string;
  latestEvaluation?: HistoryEvaluation;
  feedback?: OpportunityFeedback;
  qualityReview?: QualityReview;
};

export type FeedbackInput = {
  profileId: string;
  action: FeedbackAction;
  reasonCodes: FeedbackReasonCode[];
  notes?: string;
};

export type OpportunityCardModel = {
  id: string;
  profileId: string;
  title: string;
  companyName?: string;
  locationText?: string;
  sourceLabel: string;
  sourceAttributionUrl?: string;
  score?: number;
  roleTier?: number;
  verdict?: Verdict;
  eligible?: boolean;
  isNew?: boolean;
  presented?: boolean;
  reasons: string[];
  facts: OpportunityFacts;
  eligibilityChecks: EligibilityCheck[];
  applicationUrl?: string;
  originalUrl?: string;
  feedback?: OpportunityFeedback;
  qualityReview?: QualityReview;
};

export type RequestError = {
  message: string;
  requestId?: string;
};
