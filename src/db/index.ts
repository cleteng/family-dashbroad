/**
 * Unified database entry point.
 * Import from "@/db" in server-side code only.
 * Do not import this module from Client Components.
 */
export { db } from "./client";
export type { Db } from "./client";
export * from "./schema";
