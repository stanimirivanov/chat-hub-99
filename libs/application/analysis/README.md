# Analysis Application

Orchestrates the first deterministic Analysis Run workflow. It validates the
authenticated request identity, workspace ID, run ID, dispatcher identity, and
safe W3C processing trace carrier before invoking the capability-oriented
`AnalysisRunRepository` Effect service.

```text
HTTP boundary -> start/get use case ------> AnalysisRunRepository Tag
dispatcher    -> claim/dispatch use case -> infrastructure RPC
                                         -> validated AnalysisRun or job
```

The application library has no NestJS, Supabase, HTTP, browser, OpenTelemetry,
or generated database dependencies. The trace carrier is runtime correlation
metadata for the asynchronous boundary, not domain state. The operational job
projection and opaque claim are application contracts; lease ownership and
transactional idempotency remain PostgreSQL responsibilities. Polling, worker
runtime, model execution, findings, and streaming are not part of this package
yet.

Verify with `pnpm exec nx run-many -t lint typecheck typecheck:test test -p analysis-application`.
