# Analysis Domain

Defines the provider-independent Analysis Run identity and the minimum immutable
`created` state used by the deterministic Phase 3 server workflow. Execution,
jobs, findings, model metadata, and review state are intentionally Phase 4+
concerns.

The library depends only on inner domain identities and Effect Schema. External
rows are decoded before becoming `AnalysisRun` values.

```text
database row -> infrastructure decoder -> AnalysisRun
```

Verify with `pnpm exec nx run-many -t lint typecheck typecheck:test test -p analysis-domain`.
