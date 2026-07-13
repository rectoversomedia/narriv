/**
 * Route-specific types for Alerts routes
 */

import type { Response, NextFunction } from "express";
import type { z } from "zod";
import { AlertSeverity, AlertStatus } from "../alerts.js";
import type { AuthenticatedRequest } from "../express.js";
import type {
  Alert,
  CreateAlertInput,
  UpdateAlertInput,
  UpdateAlertStatusInput,
  UpdateAlertAssignmentInput,
  EscalationMatrix,
  AlertType,
  EscalationLevel,
  AlertSummary,
} from "../alerts.js";

// Re-export alerts types that are used in routes
export type {
  Alert,
  CreateAlertInput,
  UpdateAlertInput,
  UpdateAlertStatusInput,
  UpdateAlertAssignmentInput,
  EscalationMatrix,
} from "../alerts.js";

/**
 * Alert route params
 */
export interface AlertRouteParams {
  id: string;
}

/**
 * Alerts request body schemas (Zod)
 */
export interface AlertSchemas {
  createAlert: z.ZodSchema<CreateAlertInput>;
  updateAlert: z.ZodSchema<UpdateAlertInput>;
  updateAlertStatus: z.ZodSchema<UpdateAlertStatusInput>;
  updateAlertAssignment: z.ZodSchema<UpdateAlertAssignmentInput>;
  alertIdParams: z.ZodSchema<{ id: string }>;
}

/**
 * Alert controller methods
 */
export interface AlertController {
  /**
   * Create a new alert
   */
  createAlert: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get list of alerts with pagination and filtering
   */
  getAlerts: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get single alert by ID
   */
  getAlertById: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Update an existing alert
   */
  updateAlert: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Delete an alert
   */
  deleteAlert: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Update alert status
   */
  updateAlertStatus: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Update alert assignment
   */
  updateAlertAssignment: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get alert summary metrics
   */
  getSummary: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get alerts timeline
   */
  getTimeline: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Escalate an alert
   */
  escalateAlert: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Bulk update alerts
   */
  bulkUpdate: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Export alerts
   */
  exportAlerts: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
}

/**
 * Escalation matrix controller methods
 */
export interface EscalationMatrixController {
  /**
   * Get all escalation matrices
   */
  getMatrices: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Create a new escalation matrix
   */
  createMatrix: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Update an escalation matrix
   */
  updateMatrix: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Delete an escalation matrix
   */
  deleteMatrix: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get escalation matrix by ID
   */
  getMatrixById: (
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response,
    next: NextFunction
  ) => Promise<void>;
}

/**
 * Alert response types
 */
export interface AlertResponse extends Alert {
  _count?: {
    relatedSignals: number;
  };
}

export interface AlertCreatedResponse extends Alert {}

export interface AlertUpdatedResponse extends Alert {}

export interface AlertStatusUpdatedResponse {
  id: string;
  status: AlertStatus;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  updatedAt: string;
}

export interface AlertAssignmentUpdatedResponse {
  id: string;
  assignedTo: string | null;
  assignedTeam: string | null;
  deadline: string | null;
  escalationLevel: EscalationLevel | null;
  updatedAt: string;
}

/**
 * Alert query response
 */
export interface AlertQueryResponse {
  data: Alert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Alert summary response
 */
export interface AlertSummaryResponse extends AlertSummary {}

/**
 * Escalation matrix response
 */
export interface EscalationMatrixResponse extends EscalationMatrix {}

export interface EscalationMatrixCreatedResponse extends EscalationMatrix {}

export interface EscalationMatrixUpdatedResponse extends EscalationMatrix {}

/**
 * Alert filter options
 */
export interface AlertFilterOptions {
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  workspaceId?: string;
  search?: string;
  assignedTo?: string;
  assignedTeam?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Valid status transitions
 */
export const VALID_STATUS_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  [AlertStatus.OPEN]: [AlertStatus.ACKNOWLEDGED, AlertStatus.IN_PROGRESS, AlertStatus.RESOLVED],
  [AlertStatus.ACKNOWLEDGED]: [AlertStatus.IN_PROGRESS, AlertStatus.RESOLVED, AlertStatus.OPEN],
  [AlertStatus.IN_PROGRESS]: [AlertStatus.RESOLVED, AlertStatus.ACKNOWLEDGED, AlertStatus.OPEN],
  [AlertStatus.RESOLVED]: [AlertStatus.OPEN],
};

/**
 * Severity priority order
 */
export const SEVERITY_PRIORITY: Record<AlertSeverity, number> = {
  [AlertSeverity.CRITICAL]: 1,
  [AlertSeverity.HIGH]: 2,
  [AlertSeverity.MEDIUM]: 3,
  [AlertSeverity.LOW]: 4,
  [AlertSeverity.INFO]: 5,
};
