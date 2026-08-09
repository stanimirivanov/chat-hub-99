BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(9);

SELECT has_table('public', 'analysis_runs', 'Analysis Runs are persisted');
SELECT has_function(
    'public',
    'start_analysis_run',
    ARRAY['uuid', 'uuid', 'text', 'text'],
    'The privileged start command exists'
);

SELECT workspace_id
FROM public.workspaces
WHERE created_by = '10000000-0000-4000-8000-000000000001'
ORDER BY created_at
LIMIT 1
\gset workspace_

SET LOCAL ROLE service_role;

SELECT lives_ok(
    format(
        'SELECT public.start_analysis_run(%L, %L, %L, %L)',
        :'workspace_workspace_id'::UUID,
        '10000000-0000-4000-8000-000000000001'::UUID,
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        'omoikane=test'
    ),
    'An active workspace member can start an Analysis Run'
);

RESET ROLE;

SELECT analysis_run_id
FROM public.analysis_runs
WHERE workspace_id = :'workspace_workspace_id'
ORDER BY created_at DESC
LIMIT 1
\gset analysis_

SELECT is(
    (SELECT status FROM public.analysis_runs WHERE analysis_run_id = :'analysis_analysis_run_id'),
    'created',
    'The deterministic run starts in created state'
);

SELECT is(
    (SELECT requested_by::text FROM public.analysis_runs WHERE analysis_run_id = :'analysis_analysis_run_id'),
    '10000000-0000-4000-8000-000000000001',
    'The command records the authenticated requester'
);

SET LOCAL ROLE service_role;

SELECT results_eq(
    format(
        'SELECT analysis_run_id FROM public.get_analysis_run(%L, %L, %L)',
        :'workspace_workspace_id'::UUID,
        :'analysis_analysis_run_id'::UUID,
        '10000000-0000-4000-8000-000000000001'::UUID
    ),
    format('VALUES (%L::UUID)', :'analysis_analysis_run_id'),
    'An active member can observe the created run'
);

SELECT throws_ok(
    format(
        'SELECT public.start_analysis_run(%L, %L, %L, NULL)',
        :'workspace_workspace_id'::UUID,
        '10000000-0000-4000-8000-000000000003'::UUID,
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    ),
    'P0002',
    'Analysis Run resource is not accessible.',
    'An outsider cannot start a run'
);

RESET ROLE;

SELECT is(
    (SELECT count(*) FROM public.analysis_runs WHERE workspace_id = :'workspace_workspace_id'),
    1::BIGINT,
    'Rejected requests do not create records'
);

SELECT throws_ok(
    format(
        'UPDATE public.analysis_runs SET status = %L WHERE analysis_run_id = %L',
        'created',
        :'analysis_analysis_run_id'
    ),
    '55000',
    'Analysis Run records are immutable.',
    'Analysis Run records cannot be updated'
);

SELECT * FROM finish();
ROLLBACK;
