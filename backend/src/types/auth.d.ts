import type { Request } from "express";

/**
 * Authentication types for the Narriv application
 */

/**
 * JWT token payload stored in the token
 */
export interface TokenPayload {
  id: string;
  email: string;
  name?: string;
  role?: string;
  workspaceId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated user object attached to request
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  workspaceId?: string;
}

/**
 * User registration input
 */
export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  workspaceName?: string;
}

/**
 * User login input
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

/**
 * Password reset request input
 */
export interface PasswordResetRequestInput {
  email: string;
}

/**
 * Password reset confirmation input
 */
export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
}

/**
 * Password change input
 */
export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Email verification input
 */
export interface EmailVerificationInput {
  token: string;
}

/**
 * OAuth provider types
 */
export type OAuthProvider = "google" | "github" | "twitter";

/**
 * OAuth authorization URL response
 */
export interface OAuthAuthorizationUrl {
  url: string;
  state: string;
}

/**
 * OAuth callback input
 */
export interface OAuthCallbackInput {
  provider: OAuthProvider;
  code: string;
  state: string;
}

/**
 * OAuth account information
 */
export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

/**
 * Session information
 */
export interface Session {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

/**
 * Active sessions list response
 */
export interface ActiveSessionsResponse {
  sessions: Session[];
  currentSessionId: string;
}

/**
 * Revoke session input
 */
export interface RevokeSessionInput {
  sessionId: string;
}

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
  TOKEN_INVALID = "AUTH_TOKEN_INVALID",
  TOKEN_MISSING = "AUTH_TOKEN_MISSING",
  USER_NOT_FOUND = "AUTH_USER_NOT_FOUND",
  USER_ALREADY_EXISTS = "AUTH_USER_ALREADY_EXISTS",
  EMAIL_NOT_VERIFIED = "AUTH_EMAIL_NOT_VERIFIED",
  PASSWORD_TOO_WEAK = "AUTH_PASSWORD_TOO_WEAK",
  PASSWORD_MISMATCH = "AUTH_PASSWORD_MISMATCH",
  ACCOUNT_LOCKED = "AUTH_ACCOUNT_LOCKED",
  RATE_LIMITED = "AUTH_RATE_LIMITED",
  SESSION_EXPIRED = "AUTH_SESSION_EXPIRED",
  INVALID_OAUTH_STATE = "AUTH_INVALID_OAUTH_STATE",
  OAUTH_ACCOUNT_EXISTS = "AUTH_OAUTH_ACCOUNT_EXISTS",
  EMAIL_ALREADY_EXISTS = "AUTH_EMAIL_ALREADY_EXISTS",
}

/**
 * Authentication error
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  statusCode: number;
}

/**
 * JWT secret configuration
 */
export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

/**
 * Token types
 */
export enum TokenType {
  ACCESS = "access",
  REFRESH = "refresh",
  PASSWORD_RESET = "password_reset",
  EMAIL_VERIFICATION = "email_verification",
}

/**
 * Password requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Default password requirements
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
};

/**
 * Role types
 */
export enum UserRole {
  OWNER = "owner",
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
}

/**
 * Permission types
 */
export enum Permission {
  // Workspace permissions
  WORKSPACE_VIEW = "workspace:view",
  WORKSPACE_EDIT = "workspace:edit",
  WORKSPACE_DELETE = "workspace:delete",
  WORKSPACE_MANAGE_MEMBERS = "workspace:manage_members",

  // Signal permissions
  SIGNAL_VIEW = "signal:view",
  SIGNAL_CREATE = "signal:create",
  SIGNAL_EDIT = "signal:edit",
  SIGNAL_DELETE = "signal:delete",
  SIGNAL_ANALYZE = "signal:analyze",

  // Alert permissions
  ALERT_VIEW = "alert:view",
  ALERT_CREATE = "alert:create",
  ALERT_EDIT = "alert:edit",
  ALERT_DELETE = "alert:delete",
  ALERT_ACKNOWLEDGE = "alert:acknowledge",

  // Report permissions
  REPORT_VIEW = "report:view",
  REPORT_CREATE = "report:create",
  REPORT_EXPORT = "report:export",

  // Admin permissions
  ADMIN_SETTINGS = "admin:settings",
  ADMIN_USERS = "admin:users",
  ADMIN_INTEGRATIONS = "admin:integrations",
}

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.WORKSPACE_VIEW,
    Permission.WORKSPACE_EDIT,
    Permission.WORKSPACE_MANAGE_MEMBERS,
    Permission.SIGNAL_VIEW,
    Permission.SIGNAL_CREATE,
    Permission.SIGNAL_EDIT,
    Permission.SIGNAL_DELETE,
    Permission.SIGNAL_ANALYZE,
    Permission.ALERT_VIEW,
    Permission.ALERT_CREATE,
    Permission.ALERT_EDIT,
    Permission.ALERT_DELETE,
    Permission.ALERT_ACKNOWLEDGE,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
    Permission.ADMIN_SETTINGS,
  ],
  [UserRole.EDITOR]: [
    Permission.WORKSPACE_VIEW,
    Permission.SIGNAL_VIEW,
    Permission.SIGNAL_CREATE,
    Permission.SIGNAL_EDIT,
    Permission.SIGNAL_ANALYZE,
    Permission.ALERT_VIEW,
    Permission.ALERT_CREATE,
    Permission.ALERT_EDIT,
    Permission.ALERT_ACKNOWLEDGE,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
  ],
  [UserRole.VIEWER]: [
    Permission.WORKSPACE_VIEW,
    Permission.SIGNAL_VIEW,
    Permission.ALERT_VIEW,
    Permission.REPORT_VIEW,
  ],
};
