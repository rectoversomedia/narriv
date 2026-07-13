import type { Request, Response, NextFunction } from "express";
import type { AuthUser } from "@/types/auth.js";
import type { ZodSchema, ZodError } from "zod";

/**
 * Extended Express Request with user authentication and validated body
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  validatedBody?: Record<string, unknown>;
  requestId?: string;
  startTime?: number;
  workspaceId?: string;
}

/**
 * Extended Express Response with additional methods
 */
export interface ApiResponse<T = unknown> extends Response {
  /**
   * Send a successful JSON response with the standard API format
   */
  success: (data: T, meta?: Record<string, unknown>) => this;

  /**
   * Send an error response with the standard API format
   */
  error: (message: string, code?: string, statusCode?: number) => this;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: ValidationError[];
  requestId?: string;
  timestamp: string;
}

/**
 * Route handler type
 */
export type RouteHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>
> = (
  req: AuthenticatedRequest & {
    body: ReqBody;
    params: P;
    query: ReqQuery;
  },
  res: Response,
  next: NextFunction
) => Promise<void> | void;

/**
 * Async route handler wrapper for consistent error handling
 */
export function asyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>
>(
  fn: RouteHandler<P, ResBody, ReqBody, ReqQuery>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as Parameters<typeof fn>[0], res, next)).catch(next);
  };
}

/**
 * Express middleware type
 */
export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Error handling middleware type
 */
export type ErrorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Request timeout configuration
 */
export interface TimeoutConfig {
  default: number;
  ai_generation: number;
  ingestion: number;
  export: number;
}

/**
 * Re-export Zod types for convenience
 */
export type { ZodSchema, ZodError };
