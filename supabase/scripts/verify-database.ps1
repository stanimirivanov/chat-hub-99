$ErrorActionPreference = 'Stop'

Write-Host 'Resetting the local Supabase database...'
pnpm db:reset

if ($LASTEXITCODE -ne 0) {
    throw 'Database reset failed.'
}

Write-Host 'Linting the local database...'
pnpm db:lint

if ($LASTEXITCODE -ne 0) {
    throw 'Database linting failed.'
}

Write-Host 'Running database tests...'
pnpm db:test

if ($LASTEXITCODE -ne 0) {
    throw 'Database tests failed.'
}

Write-Host 'Database verification completed successfully.'