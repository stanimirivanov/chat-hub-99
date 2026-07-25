import type { Database as GeneratedDatabase } from '../generated/database.types';

/**
 * Complete generated contract for the schemas exposed through the Supabase
 * Data API.
 *
 * This alias creates a stable public import path while keeping the generated
 * file in an implementation-specific directory.
 */
export type Database = GeneratedDatabase;

/**
 * Public-schema contract generated from the local PostgreSQL schema.
 */
export type PublicSchema = Database['public'];
