-- ============================================================================
-- Channel restoration tests
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(8);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
(
    '99000000-0000-0000-0000-000000000001',
    'channel-restoration-owner@example.com',
    jsonb_build_object('username', 'channel-restoration-owner')
),
(
    '99000000-0000-0000-0000-000000000002',
    'channel-restoration-member@example.com',
    jsonb_build_object('username', 'channel-restoration-member')
),
(
    '99000000-0000-0000-0000-000000000003',
    'channel-restoration-outsider@example.com',
    jsonb_build_object('username', 'channel-restoration-outsider')
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '99000000-0000-0000-0000-000000000001';

SELECT public.create_workspace(
    p_name => 'Channel Restoration Workspace',
    p_slug => 'channel-restoration-workspace',
    p_description => NULL
);

RESET ROLE;

SELECT workspace_id
FROM public.workspaces
WHERE created_by = '99000000-0000-0000-0000-000000000001'::UUID
\gset workspace_

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '99000000-0000-0000-0000-000000000001';

SELECT public.add_workspace_member(
    p_workspace_id => :'workspace_workspace_id'::UUID,
    p_user_id => '99000000-0000-0000-0000-000000000002'::UUID
);

SELECT public.create_channel(
    p_workspace_id => :'workspace_workspace_id'::UUID,
    p_name => 'Restorable Channel',
    p_slug => 'restorable-channel',
    p_description => 'Preserved channel details'
) AS channel_id
\gset channel_

SELECT public.archive_channel(:'channel_channel_id'::UUID);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '';

SELECT throws_ok(
    format(
        'SELECT public.restore_channel(%L::UUID)',
        :'channel_channel_id'
    ),
    '42501',
    'Authentication is required to restore a channel',
    'An unauthenticated session cannot restore a channel'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '99000000-0000-0000-0000-000000000003';

SELECT throws_ok(
    format(
        'SELECT public.restore_channel(%L::UUID)',
        :'channel_channel_id'
    ),
    '42501',
    'Only active workspace owners may restore channels',
    'An outsider cannot restore a channel'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '99000000-0000-0000-0000-000000000002';

SELECT throws_ok(
    format(
        'SELECT public.restore_channel(%L::UUID)',
        :'channel_channel_id'
    ),
    '42501',
    'Only active workspace owners may restore channels',
    'An ordinary member cannot restore a channel'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '99000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    format(
        'SELECT public.restore_channel(%L::UUID)',
        :'channel_channel_id'
    ),
    'An active workspace owner can restore a channel'
);

SELECT results_eq(
    format(
        $sql$
            SELECT name, slug, description, channel_status
            FROM public.current_channels
            WHERE channel_id = %L::UUID
        $sql$,
        :'channel_channel_id'
    ),
    $$
        VALUES (
            'Restorable Channel'::TEXT,
            'restorable-channel'::TEXT,
            'Preserved channel details'::TEXT,
            'active'::TEXT
        )
    $$,
    'Restoration preserves details and returns the channel to active state'
);

SELECT is(
    (
        SELECT count(*)
        FROM public.channel_versions
        WHERE channel_id = :'channel_channel_id'::UUID
    ),
    1::BIGINT,
    'Restoration does not manufacture a descriptive channel version'
);

SELECT throws_ok(
    format(
        'SELECT public.restore_channel(%L::UUID)',
        :'channel_channel_id'
    ),
    '55000',
    format(
        'Channel %s does not exist or is not archived',
        :'channel_channel_id'
    ),
    'An active channel cannot be restored again'
);

SELECT public.archive_channel(:'channel_channel_id'::UUID);
SELECT public.archive_workspace(:'workspace_workspace_id'::UUID);

SELECT throws_ok(
    format(
        'SELECT public.restore_channel(%L::UUID)',
        :'channel_channel_id'
    ),
    '55000',
    format('Workspace %s is archived', :'workspace_workspace_id'),
    'A channel cannot be restored while its workspace is archived'
);

SELECT *
FROM finish();

ROLLBACK;
