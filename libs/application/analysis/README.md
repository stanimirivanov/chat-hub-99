# Analysis Application

Orchestrates the first deterministic Analysis Run workflow. It validates the
authenticated request identity, workspace ID, and run ID before invoking the
capability-oriented `AnalysisRunRepository` Effect service.

```text
HTTP boundary -> start/get use case -> AnalysisRunRepository Tag
              -> infrastructure RPC -> validated AnalysisRun
```

The application library has no NestJS, Supabase, HTTP, browser, or generated
database dependencies. Jobs, model execution, findings, and streaming are not
part of this package yet.

Verify with `pnpm exec nx run-many -t lint typecheck typecheck:test test -p analysis-application`.
