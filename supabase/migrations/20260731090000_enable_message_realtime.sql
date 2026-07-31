-- ============================================================================
-- Channel message realtime publication
-- ============================================================================
--
-- message_heads is the single mutable row in each message aggregate. Publishing
-- it produces one INSERT for message creation and one UPDATE for editing or
-- soft deletion. Realtime evaluates the table's existing RLS policies for each
-- authenticated subscriber.
-- ============================================================================

ALTER PUBLICATION supabase_realtime
ADD TABLE public.message_heads;
