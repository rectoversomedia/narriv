/**
 * Signal types for the Narriv application
 */

/**
 * Signal entity representing a captured piece of content
 */
export interface Signal {
  id: string;
  workspaceId: string;
  sourceId: string | null;
  title: string;
  content: string;
  platform: string | null;
  sentiment: Sentiment | null;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: SignalMetadata;
  analysis?: SignalAnalysis;
}

/**
 * Signal metadata from the source
 */
export interface SignalMetadata {
  author?: string;
  authorUrl?: string;
  url?: string;
  likes?: number;
  shares?: number;
  comments?: number;
  reach?: number;
  tags?: string[];
  location?: string;
  language?: string;
}

/**
 * Signal analysis result from AI
 */
export interface SignalAnalysis {
  id: string;
  signalId: string;
  sentiment: Sentiment;
  narrativeType: NarrativeType;
  stakeholder: string | null;
  impact: ImpactLevel | null;
  summary: string | null;
  recommendedAction: string | null;
  confidenceScore: number | null;
  createdAt: string;
}

/**
 * Sentiment values
 */
export enum Sentiment {
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
  NEUTRAL = "NEUTRAL",
  MIXED = "MIXED",
}

/**
 * Narrative types for signal categorization
 */
export enum NarrativeType {
  COMPLAINTS = "complaints",
  PRAISE = "praise",
  INQUIRIES = "inquiries",
  NEWS = "news",
  RUMORS = "rumors",
  TRENDS = "trends",
  VIRAL = "viral",
  CRISIS = "crisis",
  OPPORTUNITY = "opportunity",
  COMPETITIVE = "competitive",
  REGULATORY = "regulatory",
  GENERAL = "general",
}

/**
 * Impact levels
 */
export enum ImpactLevel {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * Platform types
 */
export enum Platform {
  TWITTER = "twitter",
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
  LINKEDIN = "linkedin",
  NEWS = "news",
  FORUM = "forum",
  BLOG = "blog",
  REVIEW = "review",
  OTHER = "other",
}

/**
 * Create signal input
 */
export interface CreateSignalInput {
  content: string;
  title?: string;
  sentiment?: Sentiment;
  platform?: string;
  metadata?: SignalMetadata;
  workspaceId?: string;
}

/**
 * Update signal input
 */
export interface UpdateSignalInput {
  title?: string;
  content?: string;
  sentiment?: Sentiment;
  metadata?: SignalMetadata;
}

/**
 * Signal query parameters
 */
export interface SignalQueryParams {
  page?: number;
  limit?: number;
  keyword?: string;
  platform?: string;
  sentiment?: Sentiment;
  startDate?: string;
  endDate?: string;
  sourceId?: string;
  workspaceId?: string;
}

/**
 * Signal list response with pagination
 */
export interface SignalListResponse {
  data: Signal[];
  pagination: SignalPaginationInfo;
}

/**
 * Signal pagination info (renamed to avoid conflict with common.PaginationInfo)
 */
export interface SignalPaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Signal with analysis result
 */
export interface SignalWithAnalysis extends Signal {
  analysis: SignalAnalysis | null;
  analysisStatus: "completed" | "processing" | "failed" | "pending";
}

/**
 * Batch analyze request
 */
export interface BatchAnalyzeInput {
  signalIds: string[];
  workspaceId?: string;
}

/**
 * Batch analyze result
 */
export interface BatchAnalyzeResult {
  signalId: string;
  status: "analyzed" | "skipped" | "failed";
  analysis?: SignalAnalysis;
  error?: string;
}

/**
 * Batch analyze response
 */
export interface BatchAnalyzeResponse {
  message: string;
  analyzed: number;
  skipped: number;
  failed: number;
  results: BatchAnalyzeResult[];
}

/**
 * Signal summary for dashboard (renamed to avoid conflict with common.SignalSummary)
 */
export interface SignalDashboardSummary {
  totalSignals: number;
  signals24h: number;
  signalsThisWeek: number;
  signalsThisMonth: number;
  positiveSignals: number;
  negativeSignals: number;
  neutralSignals: number;
  mixedSignals: number;
  criticalSignals: number;
  topPlatforms: PlatformStats[];
  sentimentTrend: SentimentTrend[];
}

/**
 * Platform statistics
 */
export interface PlatformStats {
  platform: string;
  count: number;
  percentage: number;
  trend: number;
}

/**
 * Sentiment trend data point
 */
export interface SentimentTrend {
  timestamp: string;
  positive: number;
  negative: number;
  neutral: number;
  mixed: number;
}

/**
 * Signal timeline data
 */
export interface SignalTimeline {
  timeline: number[];
  timelineLabels: string[];
}

/**
 * Signal filter options
 */
export interface SignalFilters {
  platforms: string[];
  sentiments: Sentiment[];
  dateRange: {
    start: string;
    end: string;
  };
  sources: string[];
  hasAnalysis: boolean;
}

/**
 * Bulk signal import result
 */
export interface BulkImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}

/**
 * Import error
 */
export interface ImportError {
  index: number;
  row?: Record<string, unknown>;
  error: string;
}

/**
 * Signal deduplication options
 */
export interface DeduplicationOptions {
  enabled: boolean;
  similarityThreshold: number;
  contentHashAlgorithm: "md5" | "sha256";
}

/**
 * Signal export format
 */
export type SignalExportFormat = "csv" | "json" | "xlsx" | "pdf";

/**
 * Signal export options
 */
export interface SignalExportOptions {
  format: SignalExportFormat;
  filters?: SignalFilters;
  includeAnalysis: boolean;
  includeMetadata: boolean;
  columns?: string[];
}
