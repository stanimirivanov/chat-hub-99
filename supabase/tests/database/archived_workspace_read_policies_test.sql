-- ============================================================================
-- Archived workspace discovery policy tests
-- ============================================================================
--
-- Archiving does not end memberships. The current workspace projection
-- therefore remains visible to still-active members, while RLS continues to
-- exclude outsiders. Restoration is deliberately outside this read-only slice.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(3);

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES
(
    '97000000-0000-0000-0000-000000000001',
    'archived-workspace-owner@example.com',
    jsonb_build_object('username', 'archived-workspace-owner')
),
(
    '97000000-0000-0000-0000-000000000002',
    'archived-workspace-member@example.com',
    jsonb_build_object('username', 'archived-workspace-member')
),
(
    '97000000-0000-0000-0000-000000000003',
    'archived-workspace-outsider@example.com',
    jsonb_build_object('username', 'archived-workspace-outsider')
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '97000000-0000-0000-0000-000000000001';

SELECT public.create_workspace(
    p_name => 'Archived Workspace Discovery',
    p_slug => 'archived-workspace-discovery'
);

RESET ROLE;

SELECT workspace_id
FROM public.workspaces
WHERE created_by =
    '97000000-0000-0000-0000-000000000001'::UUID
\gset workspace_

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '97000000-0000-0000-0000-000000000001';

SELECT public.add_workspace_member(
    p_workspace_id => :'workspace_workspace_id'::UUID,
    p_user_id => '97000000-0000-0000-0000-000000000002'::UUID
);

SELECT public.archive_workspace(
    p_workspace_id => :'workspace_workspace_id'::UUID
);

SELECT is(
    (
        SELECT count(*)
        FROM public.current_workspaces
        WHERE workspace_id = :'workspace_workspace_id'::UUID
          AND status = 'archived'
    ),
    1::BIGINT,
    'The active owner can discover the archived workspace'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '97000000-0000-0000-0000-000000000002';

SELECT is(
    (
        SELECT count(*)
        FROM public.current_workspaces
        WHERE workspace_id = :'workspace_workspace_id'::UUID
          AND status = 'archived'
    ),
    1::BIGINT,
    'A still-active member can discover the archived workspace'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '97000000-0000-0000-0000-000000000003';

SELECT is(
    (
        SELECT count(*)
        FROM public.current_workspaces
        WHERE workspace_id = :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'An outsider cannot discover the archived workspace'
);

RESET ROLE;

SELECT *
FROM finish();

ROLLBACK;
