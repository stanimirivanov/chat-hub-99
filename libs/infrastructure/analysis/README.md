# Analysis Infrastructure

Implements the Analysis Run application repository with narrowly privileged
Supabase RPCs. PostgreSQL atomically checks active workspace membership and
creates or reads the immutable run. A separate lease-fenced pair of commands
claims a requested outbox event and idempotently dispatches it into one durable,
versioned job plus its `queued` lifecycle fact. Provider rows and errors are
translated before crossing into application code.

```text
use case -> repository Tag -> Supabase Layer -> service-role RPC
         -> atomic run/event/outbox or claim/job/queued command
         -> decoded AnalysisRun, optional claim, or Analysis job
```

The service-role key is supplied only by `apps/server`; it never identifies the
caller and never reaches Angular. Browser and service roles receive no direct
event, job, or attempt-table access. The adapter never performs polling or owns
lease decisions. Worker runtime, job execution, retry/dead-letter behavior,
model execution, and generic privileged repositories remain outside this
package.

Verify with `pnpm exec nx run-many -t lint typecheck typecheck:test test -p analysis-infrastructure`.
