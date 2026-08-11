export type Verdict = "promising" | "maybe" | "reject";

export type EligibilityStatus = "pass" | "fail" | "unknown";

export type FeedbackAction = "interested" | "not_relevant" | "applied";

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
  | "other";

export type ProfileOption = {
  id: string;
  label: string;
  maxQualifiedResults?: number;
};

export type CandidateMetadata = {
  sourceId?: string;
  sourceLabel?: string;
  applicationUrl?: string;
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

export type HistoryOpportunity = {
  id: string;
  profileId?: string;
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
};

export type RequestError = {
  message: string;
  requestId?: string;
};
