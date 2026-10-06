import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  email?: string;
  isLoggedIn: boolean;
  /** CSRF state for Google OAuth (TASK-019). Cleared after callback. */
  googleOAuthState?: string;
}

export const SESSION_COOKIE_NAME = "fd_session";

export function getSessionOptions(): SessionOptions {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters long. Generate with: openssl rand -base64 32",
    );
  }

  return {
    password: secret,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};
