import type { PublicSchema } from './database.types';

/**
 * Names of tables generated for the public database schema.
 */
export type TableName = keyof PublicSchema['Tables'];

/**
 * Read shape returned when selecting a table row.
 */
export type TableRow<TName extends TableName> =
  PublicSchema['Tables'][TName]['Row'];

/**
 * Shape accepted by direct table insertion.
 *
 * Most domain tables in this project intentionally reject direct application
 * inserts. This type still reflects the generated PostgreSQL contract and may
 * be useful for trusted infrastructure or database tooling.
 */
export type TableInsert<TName extends TableName> =
  PublicSchema['Tables'][TName]['Insert'];

/**
 * Shape accepted by direct table updates.
 *
 * Domain mutations should normally use database commands rather than this
 * shape.
 */
export type TableUpdate<TName extends TableName> =
  PublicSchema['Tables'][TName]['Update'];
