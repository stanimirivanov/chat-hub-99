SELECT
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'profile_heads',
      'workspace_heads',
      'workspace_membership_heads'
  )
ORDER BY table_name, ordinal_position;