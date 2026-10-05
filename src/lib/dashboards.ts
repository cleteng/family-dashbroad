import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dashboards } from "@/db/schema/dashboards";

export type Dashboard = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const createDashboardSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "name is required").max(100, "name must be at most 100 characters")),
  description: z
    .string()
    .max(500, "description must be at most 500 characters")
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const t = v.trim();
      return t.length === 0 ? null : t;
    }),
});

export const updateDashboardSchema = z
  .object({
    name: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "name is required").max(100, "name must be at most 100 characters"))
      .optional(),
    description: z
      .string()
      .max(500, "description must be at most 500 characters")
      .optional()
      .nullable()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        const t = v.trim();
        return t.length === 0 ? null : t;
      }),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "At least one of name or description is required",
  });

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;
export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>;

function toDashboard(row: {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Dashboard {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listDashboards(userId: string): Dashboard[] {
  const rows = db
    .select()
    .from(dashboards)
    .where(eq(dashboards.userId, userId))
    .orderBy(desc(dashboards.createdAt))
    .all();
  return rows.map(toDashboard);
}

export function createDashboard(
  userId: string,
  input: CreateDashboardInput,
): Dashboard {
  const id = crypto.randomUUID();
  const now = new Date();
  const description =
    input.description === undefined ? null : input.description;

  db.insert(dashboards)
    .values({
      id,
      userId,
      name: input.name,
      description,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = db.select().from(dashboards).where(eq(dashboards.id, id)).get();
  if (!row) {
    throw new Error("Failed to create dashboard");
  }
  return toDashboard(row);
}

export function getDashboard(userId: string, id: string): Dashboard | null {
  const row = db
    .select()
    .from(dashboards)
    .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)))
    .get();
  return row ? toDashboard(row) : null;
}

export function updateDashboard(
  userId: string,
  id: string,
  input: UpdateDashboardInput,
): Dashboard | null {
  const existing = getDashboard(userId, id);
  if (!existing) return null;

  const patch: {
    name?: string;
    description?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;

  db.update(dashboards)
    .set(patch)
    .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)))
    .run();

  return getDashboard(userId, id);
}

export function deleteDashboard(userId: string, id: string): boolean {
  const existing = getDashboard(userId, id);
  if (!existing) return false;

  db.delete(dashboards)
    .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)))
    .run();
  return true;
}
