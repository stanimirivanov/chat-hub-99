# Analysis Infrastructure

Implements the Analysis Run application repository with two narrowly privileged
Supabase RPCs. PostgreSQL atomically checks active workspace membership and
creates or reads the immutable run. Provider rows and errors are translated
before crossing into application code.

```text
use case -> repository Tag -> Supabase Layer -> service-role RPC
         -> membership check + command -> decoded AnalysisRun
```

The service-role key is supplied only by `apps/server`; it never identifies the
caller and never reaches Angular. Direct table access, jobs, model execution,
and generic privileged repositories remain outside this package.

Verify with `pnpm exec nx run-many -t lint typecheck typecheck:test test -p analysis-infrastructure`.
