export type DocumentStatus =
  | "PENDING_UPLOAD"
  | "UPLOADED"
  | "VALIDATING"
  | "PROCESSING"
  | "PREPROCESSED"
  | "CLASSIFYING"
  | "ACCEPTED"
  | "DATA_EXTRACTED"
  | "RAG_INDEXED"
  | "COMPLETED"
  | "REJECTED"
  | "NEEDS_REVIEW"
  | "FAILED";

export type ResumeSkill = {
  name: string;
  category?: string | null;
  confidence: number;
};

export type ResumeExperience = {
  company?: string | null;
  title?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  description?: string | null;
  source_pages: number[];
};

export type ResumeEducation = {
  institution?: string | null;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  source_pages: number[];
};

export type ResumeLanguage = {
  language: string;
  level?: string | null;
  raw_level?: string | null;
};

export type ResumeCertification = {
  name: string;
  issuer?: string | null;
  date?: string | null;
};

export type ResumeProfileData = {
  full_name?: string | null;
  headline?: string | null;
  professional_summary?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  languages: ResumeLanguage[];
  certifications: ResumeCertification[];
};

export type ResumeDocument = {
  id: string;
  status: DocumentStatus;
  filename: string;
  result_id?: string | null;
  error_code?: string | null;
  created_at: string;
  updated_at: string;
};

export type ResumeDraft = {
  id: string;
  document_id: string;
  profile_id?: string | null;
  payload: ResumeProfileData;
  applied_at?: string | null;
};

export type UploadUrlResponse = {
  document_id: string;
  status: DocumentStatus;
  upload_url: string;
  required_headers: Record<string, string>;
};

export type ResumeApplySection =
  | "full_name"
  | "headline"
  | "professional_summary"
  | "location"
  | "skills"
  | "experience"
  | "education"
  | "languages"
  | "certifications";
