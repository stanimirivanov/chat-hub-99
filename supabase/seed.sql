-- ============================================================================
-- Local development seed data
-- ============================================================================
--
-- This seed creates a small but representative Omoikane scenario:
--
--   - one workspace owner;
--   - one ordinary workspace member;
--   - one outsider;
--   - one active workspace;
--   - two active channels;
--   - several active messages.
--
-- Stable Auth user identifiers make the scenario reproducible.
--
-- Workspace, channel, membership, and message data are created through the
-- application's database command functions. The seed therefore exercises the
-- same invariants as the application rather than duplicating aggregate writes.
--
-- This file is intended only for local development and automated verification.
-- It is executed after migrations by:
--
--   supabase db reset
-- ============================================================================


-- ============================================================================
-- Stable development identities
-- ============================================================================

DO $$
DECLARE
    owner_user_id CONSTANT UUID :=
        '10000000-0000-4000-8000-000000000001';

    member_user_id CONSTANT UUID :=
        '10000000-0000-4000-8000-000000000002';

    outsider_user_id CONSTANT UUID :=
        '10000000-0000-4000-8000-000000000003';
BEGIN
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        phone_change,
        phone_change_token,
        reauthentication_token,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    )
    VALUES
    (
        owner_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'owner@omoikane.local',
        crypt(
            'Password123!',
            gen_salt('bf')
        ),
        now(),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        jsonb_build_object(
            'provider', 'email',
            'providers', jsonb_build_array('email')
        ),
        jsonb_build_object(
            'username', 'workspace-owner',
            'display_name', 'Workspace Owner'
        ),
        now(),
        now()
    ),
    (
        member_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'member@omoikane.local',
        crypt(
            'Password123!',
            gen_salt('bf')
        ),
        now(),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        jsonb_build_object(
            'provider', 'email',
            'providers', jsonb_build_array('email')
        ),
        jsonb_build_object(
            'username', 'workspace-member',
            'display_name', 'Workspace Member'
        ),
        now(),
        now()
    ),
    (
        outsider_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'outsider@omoikane.local',
        crypt(
            'Password123!',
            gen_salt('bf')
        ),
        now(),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        jsonb_build_object(
            'provider', 'email',
            'providers', jsonb_build_array('email')
        ),
        jsonb_build_object(
            'username', 'workspace-outsider',
            'display_name', 'Workspace Outsider'
        ),
        now(),
        now()
    );
END;
$$;


-- ============================================================================
-- Workspace, channels, memberships, and messages
-- ============================================================================

DO $$
DECLARE
    owner_user_id CONSTANT UUID :=
        '10000000-0000-4000-8000-000000000001';

    member_user_id CONSTANT UUID :=
        '10000000-0000-4000-8000-000000000002';

    development_workspace_id UUID;
    general_channel_id UUID;
    engineering_channel_id UUID;
BEGIN
    -- ------------------------------------------------------------------------
    -- Create the workspace as the owner
    -- ------------------------------------------------------------------------

    PERFORM set_config(
        'request.jwt.claim.sub',
        owner_user_id::TEXT,
        true
    );

    PERFORM public.create_workspace(
        p_name => 'Omoikane Development',
        p_slug => 'omoikane-development',
        p_description =>
            'Local workspace populated by supabase/seed.sql'
    );

    SELECT workspaces.workspace_id
    INTO STRICT development_workspace_id
    FROM public.workspaces
    INNER JOIN public.workspace_heads
        ON workspace_heads.workspace_id =
            workspaces.workspace_id
    WHERE workspace_heads.current_slug =
        'omoikane-development'
      AND workspace_heads.workspace_status =
        'active';

    -- ------------------------------------------------------------------------
    -- Add the ordinary member
    -- ------------------------------------------------------------------------

    PERFORM public.add_workspace_member(
        p_workspace_id => development_workspace_id,
        p_user_id => member_user_id
    );

    -- ------------------------------------------------------------------------
    -- Create channels
    -- ------------------------------------------------------------------------

    general_channel_id := public.create_channel(
        p_workspace_id => development_workspace_id,
        p_name => 'General',
        p_slug => 'general',
        p_description =>
            'General conversation for local development'
    );

    engineering_channel_id := public.create_channel(
        p_workspace_id => development_workspace_id,
        p_name => 'Engineering',
        p_slug => 'engineering',
        p_description =>
            'Technical discussion for local development'
    );

    -- ------------------------------------------------------------------------
    -- Create messages as the owner
    -- ------------------------------------------------------------------------

    PERFORM public.create_message(
        p_channel_id => general_channel_id,
        p_content =>
            'Welcome to the local Omoikane development workspace.'
    );

    PERFORM public.create_message(
        p_channel_id => general_channel_id,
        p_content =>
            'This message was created by the workspace owner.'
    );

    PERFORM public.create_message(
        p_channel_id => engineering_channel_id,
        p_content =>
            'The Angular, Effect, and Supabase foundations are connected.'
    );

    -- ------------------------------------------------------------------------
    -- Create messages as the ordinary member
    -- ------------------------------------------------------------------------

    PERFORM set_config(
        'request.jwt.claim.sub',
        member_user_id::TEXT,
        true
    );

    PERFORM public.create_message(
        p_channel_id => general_channel_id,
        p_content =>
            'Hello from the seeded workspace member.'
    );

    PERFORM public.create_message(
        p_channel_id => engineering_channel_id,
        p_content =>
            'The next step is integrating the seeded channels into the UI.'
    );
END;
$$;
