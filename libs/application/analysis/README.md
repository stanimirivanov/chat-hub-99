# Analysis Application

Orchestrates the first deterministic Analysis Run workflow. It validates the
authenticated request identity, workspace ID, run ID, and safe W3C processing
trace carrier before invoking the capability-oriented `AnalysisRunRepository`
Effect service.

```text
HTTP boundary -> start/get use case -> AnalysisRunRepository Tag
              -> infrastructure RPC -> validated AnalysisRun
```

The application library has no NestJS, Supabase, HTTP, browser, OpenTelemetry,
or generated database dependencies. The trace carrier is runtime correlation
metadata for the asynchronous boundary, not domain state. Jobs, model
execution, findings, and streaming are not part of this package yet.

Verify with `pnpm exec nx run-many -t lint typecheck typecheck:test test -p analysis-application`.
