import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { hashPassword, isPasswordStrongEnough, verifyPassword } from "@/lib/password";

export type AuthUser = {
  id: string;
  email: string;
};

/**
 * Validate required auth env vars. Throws if invalid.
 * Call at bootstrap / startup for admin creation path.
 */
export function assertAuthEnv(): {
  adminEmail: string;
  adminPassword: string;
  sessionSecret: string;
} {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error(
      "SESSION_SECRET is required and must be at least 32 characters. Generate with: openssl rand -base64 32",
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim() ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";

  return { adminEmail, adminPassword, sessionSecret };
}

/**
 * If users table is empty and ADMIN_EMAIL / ADMIN_PASSWORD are set,
 * create the first admin. Returns the created user or null if skipped.
 */
export function ensureAdminUser(): AuthUser | null {
  const existing = db.select({ id: users.id }).from(users).limit(1).get();
  if (existing) {
    return null;
  }

  const { adminEmail, adminPassword } = assertAuthEnv();

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "users table is empty. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first administrator.",
    );
  }

  if (!isPasswordStrongEnough(adminPassword)) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 12 characters when creating the first administrator.",
    );
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const passwordHash = hashPassword(adminPassword);

  db.insert(users)
    .values({
      id,
      email: adminEmail.toLowerCase(),
      passwordHash,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id, email: adminEmail.toLowerCase() };
}

/**
 * Authenticate by email + password. Returns user or null.
 * Does not distinguish missing user vs wrong password (caller should use generic message).
 */
export function authenticateUser(
  email: string,
  password: string,
): AuthUser | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return null;

  const row = db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .get();

  if (!row) return null;
  if (!verifyPassword(password, row.passwordHash)) return null;

  return { id: row.id, email: row.email };
}

export function findUserById(id: string): AuthUser | null {
  const row = db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .get();
  return row ?? null;
}
