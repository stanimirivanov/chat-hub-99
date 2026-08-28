SELECT
    email,
    confirmation_token IS NULL
        AS confirmation_token_is_null,
    recovery_token IS NULL
        AS recovery_token_is_null,
    email_change_token_new IS NULL
        AS email_change_token_new_is_null,
    email_change IS NULL
        AS email_change_is_null,
    phone_change IS NULL
        AS phone_change_is_null,
    phone_change_token IS NULL
        AS phone_change_token_is_null,
    reauthentication_token IS NULL
        AS reauthentication_token_is_null
FROM auth.users
WHERE email LIKE '%@omoikane.local'
ORDER BY email;
