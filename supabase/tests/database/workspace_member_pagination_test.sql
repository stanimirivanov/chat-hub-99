BEGIN;

SELECT plan(2);

SELECT is(
    (
        SELECT count(*)
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'workspace_membership_heads'
          AND indexname =
                'workspace_membership_heads_active_directory_idx'
    ),
    1::BIGINT,
    'Workspace membership heads have one active-directory pagination index'
);

SELECT ok(
    (
        SELECT
            indexdef LIKE '%workspace_id%'
            AND indexdef LIKE '%membership_role DESC%'
            AND indexdef LIKE '%user_id%'
            AND indexdef LIKE '%membership_status = ''active''%'
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'workspace_membership_heads'
          AND indexname =
                'workspace_membership_heads_active_directory_idx'
    ),
    'Pagination index matches active owner-first identity ordering'
);

SELECT *
FROM finish();

ROLLBACK;
