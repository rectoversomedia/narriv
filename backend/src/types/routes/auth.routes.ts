/**
 * Route-specific types for Auth routes
 */

import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";
import type { AuthUser, RegisterInput, LoginInput } from "../auth.js";
import type { AuthenticatedRequest } from "../express.js";

// Re-export auth types that are used in routes
export type {
  AuthUser,
  RegisterInput,
  LoginInput,
} from "../auth.js";

/**
 * Auth request body schemas (Zod)
 */
export interface AuthSchemas {
  register: z.ZodSchema<RegisterInput>;
  login: z.ZodSchema<LoginInput>;
  passwordResetRequest: z.ZodSchema<{ email: string }>;
  passwordResetConfirm: z.ZodSchema<{ token: string; newPassword: string }>;
  passwordChange: z.ZodSchema<{ currentPassword: string; newPassword: string }>;
  emailVerification: z.ZodSchema<{ token: string }>;
  oauthCallback: z.ZodSchema<{ provider: string; code: string; state: string }>;
}

/**
 * Auth route params
 */
export interface AuthRouteParams {
  provider?: string;
}

/**
 * Auth controller methods
 */
export interface AuthController {
  /**
   * Register a new user
   */
  register: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Login user
   */
  login: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Logout user
   */
  logout: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Refresh access token
   */
  refreshToken: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Request password reset
   */
  requestPasswordReset: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Confirm password reset
   */
  confirmPasswordReset: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Change password (authenticated)
   */
  changePassword: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Verify email
   */
  verifyEmail: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get OAuth authorization URL
   */
  getOAuthUrl: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Handle OAuth callback
   */
  handleOAuthCallback: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get current user profile
   */
  getProfile: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Update user profile
   */
  updateProfile: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Get active sessions
   */
  getActiveSessions: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Revoke a session
   */
  revokeSession: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * Revoke all sessions except current
   */
  revokeAllSessions: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
}

/**
 * Auth middleware
 */
export interface AuthMiddleware {
  /**
   * Verify JWT token and attach user to request
   */
  verifyToken: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;

  /**
   * Optional token verification (doesn't fail if no token)
   */
  optionalToken: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;

  /**
   * Require specific role
   */
  requireRole: (...roles: string[]) => (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => void;

  /**
   * Require workspace membership
   */
  requireWorkspaceAccess: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
}

/**
 * Auth response types
 */
export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  user: AuthUser;
  accessToken: string;
  message: string;
}

export interface PasswordResetResponse {
  message: string;
  email?: string;
}

export interface ProfileResponse {
  user: AuthUser & {
    emailVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  };
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export interface SessionsResponse {
  sessions: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
  }>;
  currentSessionId: string;
}

/**
 * OAuth state
 */
export interface OAuthState {
  provider: string;
  redirectUrl?: string;
  timestamp: number;
}
