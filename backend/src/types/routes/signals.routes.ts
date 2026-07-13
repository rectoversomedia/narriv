/**
 * Route-specific types for Signals routes
 */

import type { Response, NextFunction } from "express";
import type { z } from "zod";
import type { AuthenticatedRequest } from "../express.js";
import type {
  Signal,
  SignalAnalysis,
  CreateSignalInput,
  UpdateSignalInput,
  BatchAnalyzeInput,
} from "../signals.js";

// Re-export signals types that are used in routes
export type {
  Signal,
  SignalAnalysis,
  CreateSignalInput,
  UpdateSignalInput,
  BatchAnalyzeInput,
} from "../signals.js";

/**
 * Signal route params
 */
export interface SignalRouteParams {
  id: string;
}

/**
 * Signals request body schemas (Zod)
 */
export interface SignalSchemas {
  createSignal: z.ZodSchema<CreateSignalInput>;
  updateSignal: z.ZodSchema<UpdateSignalInput>;
  signalIdParams: z.ZodSchema<{ id: string }>;
  batchAnalyze: z.ZodSchema<BatchAnalyzeInput>;
}

/**
 * Signal controller methods
 */
export interface SignalController {
  /**
   * Get list of signals with pagination and filtering
   */
  getSignals: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get single signal by ID
   */
  getSignalById: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Create a new signal
   */
  createSignal: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Update an existing signal
   */
  updateSignal: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Delete a signal
   */
  deleteSignal: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Analyze a single signal with AI
   */
  analyzeSignal: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Batch analyze multiple signals
   */
  batchAnalyze: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get dashboard metadata for signals
   */
  getMeta: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get signal summary statistics
   */
  getSummary: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get signals by platform
   */
  getByPlatform: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get signals timeline
   */
  getTimeline: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Export signals
   */
  exportSignals: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
}

/**
 * Signal response types
 */
export interface SignalResponse {
  signal: Signal;
  analysis?: SignalAnalysis;
  analysisStatus?: "completed" | "processing" | "failed" | "pending";
}

export interface SignalCreatedResponse {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  platform: string | null;
  sentiment: string | null;
  capturedAt: string;
  createdAt: string;
}

export interface SignalAnalysisResponse {
  message: string;
  analysis: SignalAnalysis;
  fromCache: boolean;
}

export interface SignalMetaResponse {
  totalSignals: number;
  followUps: Array<{
    title: string;
    badge: string;
    meta: string;
    time: string;
    tone: string;
  }>;
  recommendations: Array<{
    title: string;
    desc: string;
    badge: string | null;
    tone: string;
  }>;
  sourceDistribution: Array<{
    name: string;
    value: string;
    color: string;
  }>;
  timeline: number[];
  timelineLabels: string[];
  investigationQueue: Array<{
    title: string;
    meta: string;
    badge: string;
    tone: string;
  }>;
  metrics: {
    totalSignals24h: number;
    negativeSignals24h: number;
    criticalSignals24h: number;
  };
  aiSummary: {
    title: string;
    content: {
      en: string;
      id: string;
    };
    insight: {
      en: string;
      id: string;
    };
  } | null;
}

export interface SignalSummaryResponse {
  totalSignals: number;
  signals24h: number;
  signalsThisWeek: number;
  signalsThisMonth: number;
  positiveSignals: number;
  negativeSignals: number;
  neutralSignals: number;
  criticalSignals: number;
  topPlatforms: Array<{
    platform: string;
    count: number;
    percentage: number;
    trend: number;
  }>;
  sentimentTrend: Array<{
    timestamp: string;
    positive: number;
    negative: number;
    neutral: number;
  }>;
}

/**
 * Signal filter options
 */
export interface SignalFilterOptions {
  keyword?: string;
  platform?: string;
  sentiment?: string;
  startDate?: string;
  endDate?: string;
  sourceId?: string;
  workspaceId?: string;
}

/**
 * Signal query response
 */
export interface SignalQueryResponse {
  data: Signal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
