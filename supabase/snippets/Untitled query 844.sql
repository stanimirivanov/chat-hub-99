SELECT
    routine_schema,
    routine_name,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'private'
  AND routine_name IN (
      'is_active_workspace_member',
      'is_active_workspace_owner'
  );