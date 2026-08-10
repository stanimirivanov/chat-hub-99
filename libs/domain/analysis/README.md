# Analysis Domain

Defines the provider-independent Analysis Run identity and its observable
processing states: `created`, `queued`, `running`, `succeeded`, and `failed`.
Only failed runs carry a bounded, safe failure category. Execution mechanics,
jobs, findings, model metadata, and review state remain outside the domain
value.

The library depends only on inner domain identities and Effect Schema. External
rows are decoded before becoming `AnalysisRun` values.

```text
lifecycle projection -> infrastructure decoder -> AnalysisRun
```

Verify with `pnpm exec nx run-many -t lint typecheck typecheck:test test -p analysis-domain`.
