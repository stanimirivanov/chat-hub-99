-- Supports owner-first keyset pagination of active workspace memberships.
-- The stable user identity is the tie-breaker inside each role.
CREATE INDEX workspace_membership_heads_active_directory_idx
ON public.workspace_membership_heads (
    workspace_id,
    membership_role DESC,
    user_id ASC
)
WHERE membership_status = 'active';


COMMENT ON INDEX public.workspace_membership_heads_active_directory_idx IS
    'Supports active workspace-member keyset pages ordered by role and stable profile identity.';
