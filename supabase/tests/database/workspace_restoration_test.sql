-- ============================================================================
-- Workspace restoration tests
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(7);

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES
(
    '98000000-0000-0000-0000-000000000001',
    'workspace-restoration-owner@example.com',
    jsonb_build_object('username', 'workspace-restoration-owner')
),
(
    '98000000-0000-0000-0000-000000000002',
    'workspace-restoration-member@example.com',
    jsonb_build_object('username', 'workspace-restoration-member')
),
(
    '98000000-0000-0000-0000-000000000003',
    'workspace-restoration-outsider@example.com',
    jsonb_build_object('username', 'workspace-restoration-outsider')
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '98000000-0000-0000-0000-000000000001';

SELECT public.create_workspace(
    p_name => 'Restorable Workspace',
    p_slug => 'restorable-workspace',
    p_description => 'Preserved across lifecycle changes'
);

RESET ROLE;

SELECT workspace_id
FROM public.workspaces
WHERE created_by =
    '98000000-0000-0000-0000-000000000001'::UUID
\gset workspace_

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '98000000-0000-0000-0000-000000000001';

SELECT public.add_workspace_member(
    p_workspace_id => :'workspace_workspace_id'::UUID,
    p_user_id => '98000000-0000-0000-0000-000000000002'::UUID
);

SELECT public.archive_workspace(:'workspace_workspace_id'::UUID);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '98000000-0000-0000-0000-000000000003';

SELECT throws_ok(
    format(
        'SELECT public.restore_workspace(%L::UUID)',
        :'workspace_workspace_id'
    ),
    '42501',
    'Only active workspace owners may restore the workspace',
    'An outsider cannot restore an archived workspace'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '98000000-0000-0000-0000-000000000002';

SELECT throws_ok(
    format(
        'SELECT public.restore_workspace(%L::UUID)',
        :'workspace_workspace_id'
    ),
    '42501',
    'Only active workspace owners may restore the workspace',
    'An ordinary active member cannot restore an archived workspace'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '98000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    format(
        'SELECT public.restore_workspace(%L::UUID)',
        :'workspace_workspace_id'
    ),
    'An active owner can restore an archived workspace'
);

SELECT results_eq(
    format(
        $sql$
            SELECT version_number, name, slug, description, status
            FROM public.current_workspaces
            WHERE workspace_id = %L::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            3,
            'Restorable Workspace'::TEXT,
            'restorable-workspace'::TEXT,
            'Preserved across lifecycle changes'::TEXT,
            'active'::TEXT
        )
    $$,
    'Restoration preserves details and advances to an active version'
);

SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id = :'workspace_workspace_id'::UUID
    ),
    1::BIGINT,
    'RLS still exposes only the current immutable workspace version'
);

SELECT throws_ok(
    format(
        'SELECT public.restore_workspace(%L::UUID)',
        :'workspace_workspace_id'
    ),
    '55000',
    'Only archived workspaces can be restored',
    'An active workspace cannot be restored again'
);

RESET ROLE;

SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id = :'workspace_workspace_id'::UUID
    ),
    3::BIGINT,
    'The database retains create, archive, and restore versions'
);

SELECT *
FROM finish();

ROLLBACK;
